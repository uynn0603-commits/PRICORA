import { Hono } from "hono";
import { invitationTemplateId } from "@/lib/invitation-catalog";
import { contentPhotoIds, fieldErrors, firstError, normalizeContent, TRADITIONAL_TEMPLATE_ID, type InvitationContent } from "@/lib/invitation-content";
import { getPlanById } from "@/lib/plans";
import type { InvitationStatus } from "@/lib/types";
import { requireActivePlan, requireStudio, studioOf, type AppEnv } from "../auth";
import { newId } from "../crypto";
import { asStudio, asSystem, type Tx } from "../db";
import { resolveInvitation, toInvitation, type InvitationRow } from "../invitations";
import { DATE_RE, slugify, str } from "../rules";

export const invitationRoutes = new Hono<AppEnv>();

invitationRoutes.use("/invitations", requireStudio);
invitationRoutes.use("/invitations/*", requireStudio);
invitationRoutes.use("/invitations", async (c, next) => (c.req.method === "GET" ? next() : requireActivePlan(c, next)));
invitationRoutes.use("/invitations/*", async (c, next) => (c.req.method === "GET" ? next() : requireActivePlan(c, next)));

const STATUSES = new Set<InvitationStatus>(["published", "draft"]);
const MAX_PHOTOS = 12;
const HTTPS = /^https:\/\/\S+$/;

interface InvitationInput {
  album_id: string | null;
  status: InvitationStatus;
  template_id: string;
  groom_name: string;
  bride_name: string;
  groom_parents: string;
  bride_parents: string;
  wedding_date: string | null;
  wedding_time: string;
  venue: string;
  address: string;
  map_url: string;
  message: string;
  thank_you: string;
  music_url: string;
  photo_ids: string[];
  content: InvitationContent | null;
}

// Validates the form and checks the album and photos belong to this studio.
async function readInput(tx: Tx, studioId: string, body: Record<string, unknown>): Promise<InvitationInput | string> {
  const groom = str(body.groomName, 80);
  const bride = str(body.brideName, 80);
  if (!groom || !bride) return "Vui lòng nhập tên chú rể và cô dâu.";
  const status = String(body.status || "published");
  if (!STATUSES.has(status as InvitationStatus)) return "Trạng thái thiệp không hợp lệ.";
  const date = str(body.weddingDate, 10);
  if (date && !DATE_RE.test(date)) return "Ngày cưới không hợp lệ.";
  const mapUrl = str(body.mapUrl, 500);
  const musicUrl = str(body.musicUrl, 500);
  if (mapUrl && !HTTPS.test(mapUrl)) return "Liên kết bản đồ phải bắt đầu bằng https://.";
  if (musicUrl && !HTTPS.test(musicUrl)) return "Liên kết nhạc phải bắt đầu bằng https://.";
  const albumId = str(body.albumId, 80);
  const templateId = invitationTemplateId(str(body.templateId, 40));
  const traditional = templateId === TRADITIONAL_TEMPLATE_ID;
  const sentContent = body.content && typeof body.content === "object" && !Array.isArray(body.content);
  const content = sentContent || traditional ? normalizeContent(body.content, true) : null;
  let photoIds = [...new Set(Array.isArray(body.photoIds) ? body.photoIds.map((id) => str(id, 80)).filter(Boolean) : [])].slice(0, traditional ? 24 : MAX_PHOTOS);
  let groomParents = str(body.groomParents, 160);
  let brideParents = str(body.brideParents, 160);
  let weddingTime = str(body.weddingTime, 40);
  let venue = str(body.venue, 160);
  let address = str(body.address, 240);
  let message = str(body.message, 1000);
  let thankYou = str(body.thankYou, 500);
  let resolvedMap = mapUrl;
  if (content && traditional) {
    const known = new Set<string>();
    if (albumId) {
      const rows = await tx<Array<{ id: string }>>`select id from photos where studio_id = ${studioId} and album_id = ${albumId}`;
      rows.forEach((row) => known.add(row.id));
    }
    const problem = firstError(
      fieldErrors(
        {
          albumId,
          status: status as InvitationStatus,
          templateId,
          groomName: groom,
          brideName: bride,
          groomParents,
          brideParents,
          weddingDate: date,
          weddingTime,
          venue,
          address,
          mapUrl,
          message,
          thankYou,
          musicUrl,
          photoIds,
          content,
        },
        albumId ? known : null,
      ),
    );
    if (problem) return problem;
    photoIds = contentPhotoIds(content);
    groomParents = [content.groomFamily.fatherName, content.groomFamily.motherName].filter(Boolean).join(" · ").slice(0, 160);
    brideParents = [content.brideFamily.fatherName, content.brideFamily.motherName].filter(Boolean).join(" · ").slice(0, 160);
    const event = content.events.find((item) => item.venueName || item.venueAddress || item.mapUrl);
    const place = content.places.find((item) => item.mapUrl);
    weddingTime = event?.startTime || "";
    venue = event?.venueName || place?.name || "";
    address = event?.venueAddress || place?.address || "";
    resolvedMap = event?.mapUrl || place?.mapUrl || "";
    message = (content.invitationMessage || content.introduction).slice(0, 1000);
    thankYou = content.closingMessage.slice(0, 500);
  }
  if (albumId) {
    const [album] = await tx`select 1 from albums where id = ${albumId} and studio_id = ${studioId}`;
    if (!album) return "Album không còn tồn tại.";
    if (!traditional && photoIds.length) {
      const rows = await tx<Array<{ id: string }>>`select id from photos where studio_id = ${studioId} and album_id = ${albumId} and id = any(${photoIds})`;
      if (rows.length !== photoIds.length) return "Một số ảnh không còn trong album. Vui lòng chọn lại.";
    }
  } else if (photoIds.length) {
    return "Hãy chọn album trước khi chọn ảnh.";
  }
  return {
    album_id: albumId || null,
    status: status as InvitationStatus,
    template_id: templateId,
    groom_name: groom,
    bride_name: bride,
    groom_parents: groomParents,
    bride_parents: brideParents,
    wedding_date: date || null,
    wedding_time: weddingTime,
    venue,
    address,
    map_url: resolvedMap,
    message,
    thank_you: thankYou,
    music_url: musicUrl,
    photo_ids: photoIds,
    content,
  };
}

function stored(tx: Tx, input: InvitationInput, extra: Record<string, unknown> = {}) {
  const { content, ...rest } = input;
  return { ...extra, ...rest, ...(content ? { content: tx.json(content) } : {}) };
}

async function uniqueSlug(tx: Tx, studioId: string, base: string): Promise<string> {
  const root = slugify(base) || "thiep";
  const rows = await tx<Array<{ slug: string }>>`select slug from invitations where studio_id = ${studioId} and (slug = ${root} or slug like ${`${root}-%`})`;
  const taken = new Set(rows.map((row) => row.slug));
  let candidate = root;
  for (let count = 2; taken.has(candidate); count += 1) candidate = `${root}-${count}`;
  return candidate;
}

invitationRoutes.get("/invitations", async (c) => {
  const { studioId } = studioOf(c);
  const rows = await asStudio(studioId, (tx) => tx<InvitationRow[]>`select * from invitations where studio_id = ${studioId} order by created_at desc`);
  return c.json({ invitations: rows.map(toInvitation) });
});

invitationRoutes.post("/invitations", async (c) => {
  const { studioId, planId } = studioOf(c);
  const body = await c.req.json().catch(() => ({}));
  return asStudio(studioId, async (tx) => {
    const input = await readInput(tx, studioId, body);
    if (typeof input === "string") return c.json({ error: input }, 422);
    const plan = getPlanById(planId);
    if (plan.invitations != null) {
      const [count] = await tx<Array<{ total: number }>>`select count(*)::int as total from invitations where studio_id = ${studioId}`;
      if (count.total >= plan.invitations) {
        return c.json({ error: `Gói ${plan.name} cho phép tối đa ${plan.invitations} thiệp. Nâng cấp gói để tạo thêm.` }, 422);
      }
    }
    const id = newId("inv");
    const slug = await uniqueSlug(tx, studioId, `${input.groom_name}-${input.bride_name}`);
    const [row] = await tx<InvitationRow[]>`
      insert into invitations ${tx(stored(tx, input, { id, studio_id: studioId, slug }))}
      returning *`;
    return c.json({ invitation: toInvitation(row) }, 201);
  });
});

invitationRoutes.put("/invitations/:id", async (c) => {
  const { studioId } = studioOf(c);
  const body = await c.req.json().catch(() => ({}));
  return asStudio(studioId, async (tx) => {
    const [existing] = await tx<InvitationRow[]>`select * from invitations where id = ${c.req.param("id")} and studio_id = ${studioId}`;
    if (!existing) return c.json({ error: "Không tìm thấy thiệp." }, 404);
    const input = await readInput(tx, studioId, body);
    if (typeof input === "string") return c.json({ error: input }, 422);
    const [row] = await tx<InvitationRow[]>`
      update invitations set ${tx(stored(tx, input))}, updated_at = now()
      where id = ${existing.id}
      returning *`;
    return c.json({ invitation: toInvitation(row) });
  });
});

invitationRoutes.delete("/invitations/:id", async (c) => {
  const { studioId } = studioOf(c);
  const removed = await asStudio(
    studioId,
    (tx) => tx`delete from invitations where id = ${c.req.param("id")} and studio_id = ${studioId} returning id`,
  );
  if (!removed.length) return c.json({ error: "Không tìm thấy thiệp." }, 404);
  return c.json({ ok: true });
});

invitationRoutes.get("/public/:studio/invitations/:slug", async (c) => {
  const found = await asSystem((tx) => resolveInvitation(tx, c.req.param("studio"), c.req.param("slug")));
  if (!found) return c.json({ invitation: null }, 404);
  return c.json(found);
});
