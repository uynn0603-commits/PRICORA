import { Hono } from "hono";
import { isTemplateId, suggestTemplateId } from "@/lib/catalog";
import { getPlanById } from "@/lib/plans";
import { requireStudio, studioOf, type AppEnv } from "../auth";
import { newId } from "../crypto";
import { asStudio, type Tx } from "../db";
import { getAlbum, PHOTO_COLUMNS, studioUsage, toPhoto, type PhotoRow } from "../data";
import { DATE_RE, str, uniqueAlbumSlug } from "../rules";
import { deleteObjects, isImageObject, isValidKey, MAX_PHOTO_BYTES, objectSize, presignUpload } from "../storage";

export const albumRoutes = new Hono<AppEnv>();

albumRoutes.use("/albums", requireStudio);
albumRoutes.use("/albums/*", requireStudio);
albumRoutes.use("/uploads/*", requireStudio);

const STATUSES = new Set(["published", "draft", "hidden"]);
const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp"]);
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_COVER_BYTES = 25 * 1024 * 1024;

type Columns = Record<string, string | number | boolean | null>;

// Validates album fields and maps them to columns. On create the required fields must be present.
function albumColumns(input: Record<string, unknown>, studioId: string, creating: boolean): Columns | string {
  const has = (key: string) => creating || key in input;
  const columns: Columns = {};
  if (has("name")) {
    const name = str(input.name, 160);
    if (!name) return "Vui lòng nhập tên album.";
    columns.name = name;
  }
  if (has("customerName")) {
    const customer = str(input.customerName, 160);
    if (!customer) return "Vui lòng nhập tên khách hàng.";
    columns.customer_name = customer;
  }
  if (has("customerPhone")) columns.customer_phone = str(input.customerPhone, 40);
  if (has("occasion")) columns.occasion = str(input.occasion, 40) || "Other";
  if (has("description")) columns.description = str(input.description, 2000);
  if (has("password")) columns.password = str(input.password, 100);
  for (const [key, column] of [
    ["shootingDate", "shooting_date"],
    ["expiresAt", "expires_at"],
  ] as const) {
    if (!has(key)) continue;
    const value = str(input[key], 10);
    if (value && !DATE_RE.test(value)) return "Ngày không hợp lệ.";
    columns[column] = value || null;
  }
  if (has("status")) {
    const status = String(input.status || "published");
    if (!STATUSES.has(status)) return "Trạng thái album không hợp lệ.";
    columns.status = status;
  }
  if (has("templateId")) {
    const templateId = String(input.templateId || "");
    if (isTemplateId(templateId)) columns.template_id = templateId;
    else if (creating) columns.template_id = suggestTemplateId(String(input.occasion || ""));
    else return "Giao diện không hợp lệ.";
  }
  if (has("allowDownload")) columns.allow_download = input.allowDownload !== false;
  if (has("selectionEnabled")) columns.selection_enabled = input.selectionEnabled === true;
  if (has("selectionLimit")) {
    const limit = Math.round(Number(input.selectionLimit) || 0);
    if (limit < 0 || limit > 10000) return "Số ảnh được chọn không hợp lệ.";
    columns.selection_limit = limit || null;
  }
  if ("selectionLocked" in input) columns.selection_locked = input.selectionLocked === true;
  if ("coverId" in input) columns.cover_id = str(input.coverId, 80);
  if ("coverKey" in input) {
    const key = String(input.coverKey || "");
    if (key && (!isValidKey(key) || !key.startsWith(`studios/${studioId}/covers/`))) return "Ảnh bìa không hợp lệ.";
    columns.cover_key = key;
  }
  return columns;
}

const COVER_ERROR = "Ảnh bìa không phải tệp JPG, PNG hoặc WEBP hợp lệ.";

async function coverIsImage(columns: Record<string, unknown>): Promise<boolean> {
  const key = columns.cover_key;
  if (typeof key !== "string" || !key) return true;
  if (await isImageObject(key)) return true;
  await deleteObjects([key]);
  return false;
}

async function albumOr404(tx: Tx, studioId: string, albumId: string) {
  const [row] = await tx<Array<{ id: string; coverId: string; coverKey: string }>>`
    select id, cover_id, cover_key from albums where id = ${albumId} and studio_id = ${studioId}`;
  return row || null;
}

albumRoutes.post("/albums", async (c) => {
  const { studioId, planId } = studioOf(c);
  const input = await c.req.json().catch(() => ({}));
  const columns = albumColumns(input, studioId, true);
  if (typeof columns === "string") return c.json({ error: columns }, 422);
  if (!(await coverIsImage(columns))) return c.json({ error: COVER_ERROR }, 422);
  const plan = getPlanById(planId);
  return asStudio(studioId, async (tx) => {
    const usage = await studioUsage(tx, studioId);
    if (plan.albums != null && usage.albums >= plan.albums) {
      return c.json({ error: `Gói ${plan.name} cho phép tối đa ${plan.albums} album. Nâng cấp gói để tạo thêm.` }, 422);
    }
    const id = newId("alb");
    const row = { id, studio_id: studioId, slug: await uniqueAlbumSlug(tx, String(columns.name), studioId), ...columns };
    await tx`insert into albums ${tx(row)}`;
    return c.json({ album: await getAlbum(tx, studioId, id) }, 201);
  });
});

albumRoutes.patch("/albums/:id", async (c) => {
  const { studioId } = studioOf(c);
  const albumId = c.req.param("id");
  const columns = albumColumns(await c.req.json().catch(() => ({})), studioId, false);
  if (typeof columns === "string") return c.json({ error: columns }, 422);
  if (!(await coverIsImage(columns))) return c.json({ error: COVER_ERROR }, 422);
  const result = await asStudio(studioId, async (tx) => {
    const current = await albumOr404(tx, studioId, albumId);
    if (!current) return null;
    if (Object.keys(columns).length) await tx`update albums set ${tx(columns)}, updated_at = now() where id = ${albumId}`;
    const replaced = "cover_key" in columns && current.coverKey && current.coverKey !== columns.cover_key ? current.coverKey : "";
    return { album: await getAlbum(tx, studioId, albumId), replaced };
  });
  if (!result) return c.json({ error: "Không tìm thấy album." }, 404);
  if (result.replaced) await deleteObjects([result.replaced]);
  return c.json({ album: result.album });
});

albumRoutes.delete("/albums/:id", async (c) => {
  const { studioId } = studioOf(c);
  const albumId = c.req.param("id");
  const keys = await asStudio(studioId, async (tx) => {
    const current = await albumOr404(tx, studioId, albumId);
    if (!current) return null;
    const files = await tx<Array<{ key: string }>>`
      select unnest(array[storage_key, preview_key, thumb_key]) as key from photos where album_id = ${albumId} and storage_key is not null`;
    await tx`delete from albums where id = ${albumId}`;
    return [...files.map((file) => file.key), current.coverKey];
  });
  if (!keys) return c.json({ error: "Không tìm thấy album." }, 404);
  await deleteObjects(keys);
  return c.json({ ok: true });
});

// Extends from the current expiry, or from today when the album has already expired.
albumRoutes.post("/albums/:id/extend", async (c) => {
  const { studioId } = studioOf(c);
  const albumId = c.req.param("id");
  const { days } = await c.req.json().catch(() => ({}));
  const amount = Math.min(3650, Math.max(1, Math.round(Number(days) || 30)));
  return asStudio(studioId, async (tx) => {
    const [row] = await tx`
      update albums set expires_at = greatest(coalesce(expires_at, current_date), current_date) + ${amount}::int, updated_at = now()
      where id = ${albumId} and studio_id = ${studioId} returning id`;
    if (!row) return c.json({ error: "Không tìm thấy album." }, 404);
    return c.json({ album: await getAlbum(tx, studioId, albumId) });
  });
});

/* ---------- Client selection ---------- */

albumRoutes.get("/albums/:id/selection", async (c) => {
  const { studioId } = studioOf(c);
  const album = await asStudio(studioId, (tx) => getAlbum(tx, studioId, c.req.param("id")));
  if (!album) return c.json({ error: "Không tìm thấy album." }, 404);
  return c.json({ selection: album.selection, selectionLocked: album.selectionLocked });
});

albumRoutes.delete("/albums/:id/selection", async (c) => {
  const { studioId } = studioOf(c);
  const albumId = c.req.param("id");
  return asStudio(studioId, async (tx) => {
    if (!(await albumOr404(tx, studioId, albumId))) return c.json({ error: "Không tìm thấy album." }, 404);
    await tx`delete from album_selections where album_id = ${albumId}`;
    await tx`update albums set selection_locked = false where id = ${albumId}`;
    return c.json({ ok: true });
  });
});

/* ---------- Photos ---------- */

albumRoutes.put("/albums/:id/photos/order", async (c) => {
  const { studioId } = studioOf(c);
  const albumId = c.req.param("id");
  const { ids } = await c.req.json().catch(() => ({}));
  const order: string[] = Array.isArray(ids) ? ids.map(String) : [];
  return asStudio(studioId, async (tx) => {
    if (!(await albumOr404(tx, studioId, albumId))) return c.json({ error: "Không tìm thấy album." }, 404);
    // Photos missing from the list keep their relative order after the listed ones.
    await tx`update photos set position = position + 1000000 where album_id = ${albumId}`;
    await tx`
      update photos p set position = o.ord
      from unnest(${order}::text[]) with ordinality as o(id, ord)
      where p.id = o.id and p.album_id = ${albumId}`;
    await tx`update albums set updated_at = now() where id = ${albumId}`;
    return c.json({ ok: true });
  });
});

albumRoutes.post("/albums/:id/photos/delete", async (c) => {
  const { studioId } = studioOf(c);
  const albumId = c.req.param("id");
  const { ids } = await c.req.json().catch(() => ({}));
  const remove: string[] = Array.isArray(ids) ? ids.map(String) : [];
  const result = await asStudio(studioId, async (tx) => {
    const current = await albumOr404(tx, studioId, albumId);
    if (!current) return null;
    const deleted = await tx<Array<{ storageKey: string | null; previewKey: string | null; thumbKey: string | null }>>`
      delete from photos where album_id = ${albumId} and id = any(${remove}::text[]) returning storage_key, preview_key, thumb_key`;
    if (remove.includes(current.coverId)) {
      await tx`
        update albums set cover_id = coalesce((select id from photos where album_id = ${albumId} order by position, id limit 1), '')
        where id = ${albumId}`;
    }
    await tx`update albums set updated_at = now() where id = ${albumId}`;
    const [album] = await tx<Array<{ coverId: string }>>`select cover_id from albums where id = ${albumId}`;
    return { keys: deleted.flatMap((row) => [row.storageKey || "", row.previewKey || "", row.thumbKey || ""]), coverId: album.coverId };
  });
  if (!result) return c.json({ error: "Không tìm thấy album." }, 404);
  await deleteObjects(result.keys);
  return c.json({ coverId: result.coverId });
});

function extensionOf(name: string, type: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (!IMAGE_EXT.has(ext) || (type && !IMAGE_TYPES.has(type))) return null;
  return ext === "jpeg" ? "jpg" : ext;
}

async function quotaError(tx: Tx, studioId: string, planId: string, bytes: number): Promise<string> {
  const plan = getPlanById(planId);
  const usage = await studioUsage(tx, studioId);
  return usage.storage + bytes > plan.storage ? `Vượt dung lượng gói ${plan.name}` : "";
}

// Step 1 of an upload: check type and quota, then hand out a URL the browser PUTs the file to.
albumRoutes.post("/albums/:id/uploads", async (c) => {
  const { studioId, planId } = studioOf(c);
  const albumId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const ext = extensionOf(String(body.name || ""), String(body.type || ""));
  const size = Number(body.size) || 0;
  if (!ext || size <= 0) return c.json({ error: "Chỉ chấp nhận tệp JPG, PNG hoặc WEBP." }, 422);
  if (size > MAX_PHOTO_BYTES) return c.json({ error: "Ảnh vượt quá 60 MB." }, 422);
  return asStudio(studioId, async (tx) => {
    if (!(await albumOr404(tx, studioId, albumId))) return c.json({ error: "Không tìm thấy album." }, 404);
    const quota = await quotaError(tx, studioId, planId, size);
    if (quota) return c.json({ error: quota }, 422);
    const photoId = newId("pho");
    const key = `studios/${studioId}/albums/${albumId}/${photoId}.${ext}`;
    const variants: Record<string, { key: string; uploadUrl: string }> = {};
    for (const name of VARIANTS) {
      const variantKey = variantKeyFor(studioId, albumId, photoId, name);
      variants[name] = { key: variantKey, uploadUrl: await presignUpload(variantKey) };
    }
    return c.json({ photoId, key, uploadUrl: await presignUpload(key), variants });
  });
});

const VARIANTS = ["preview", "thumb"] as const;
const MAX_VARIANT_BYTES = { preview: 8 * 1024 * 1024, thumb: 2 * 1024 * 1024 };

function variantKeyFor(studioId: string, albumId: string, photoId: string, name: (typeof VARIANTS)[number]) {
  return `studios/${studioId}/albums/${albumId}/${photoId}_${name}.jpg`;
}

// Resized copies are optional: when one is missing or invalid the gallery falls back to the original.
async function acceptVariant(expected: string, sent: unknown, limit: number): Promise<string | null> {
  if (sent !== expected) return null;
  const size = await objectSize(expected);
  if (size && size <= limit && (await isImageObject(expected))) return expected;
  if (size != null) await deleteObjects([expected]);
  return null;
}

// Step 2: the file is in storage; record it with its real size.
albumRoutes.post("/albums/:id/photos", async (c) => {
  const { studioId, planId } = studioOf(c);
  const albumId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const photoId = String(body.photoId || "");
  const key = String(body.key || "");
  if (!/^pho_[A-Za-z0-9]+$/.test(photoId) || !key.startsWith(`studios/${studioId}/albums/${albumId}/${photoId}.`) || !isValidKey(key)) {
    return c.json({ error: "Tệp tải lên không hợp lệ." }, 422);
  }
  const size = await objectSize(key);
  if (size == null || size <= 0) return c.json({ error: "Không tìm thấy tệp vừa tải lên." }, 422);
  if (!(await isImageObject(key))) {
    await deleteObjects([key]);
    return c.json({ error: "Tệp này không phải ảnh JPG, PNG hoặc WEBP hợp lệ." }, 422);
  }
  const width = Math.max(1, Math.round(Number(body.w) || 4));
  const height = Math.max(1, Math.round(Number(body.h) || 3));
  const previewKey = await acceptVariant(variantKeyFor(studioId, albumId, photoId, "preview"), body.previewKey, MAX_VARIANT_BYTES.preview);
  const thumbKey = await acceptVariant(variantKeyFor(studioId, albumId, photoId, "thumb"), body.thumbKey, MAX_VARIANT_BYTES.thumb);
  const uploaded = [key, previewKey, thumbKey].filter((value): value is string => Boolean(value));
  const result = await asStudio(studioId, async (tx) => {
    const album = await albumOr404(tx, studioId, albumId);
    if (!album) return { status: 404 as const, error: "Không tìm thấy album." };
    // A retried confirm whose first response was lost returns the photo already recorded.
    const [existing] = await tx`select ${tx.unsafe(PHOTO_COLUMNS)} from photos where id = ${photoId} and album_id = ${albumId}`;
    if (existing) return { photo: toPhoto(existing as PhotoRow), coverId: album.coverId };
    if (size > MAX_PHOTO_BYTES) return { status: 422 as const, error: "Ảnh vượt quá 60 MB." };
    const quota = await quotaError(tx, studioId, planId, size);
    if (quota) return { status: 422 as const, error: quota };
    const [photo] = await tx`
      insert into photos (id, album_id, studio_id, position, name, storage_key, preview_key, thumb_key, focal, width, height, size)
      values (${photoId}, ${albumId}, ${studioId},
        (select coalesce(max(position), 0) + 1 from photos where album_id = ${albumId}),
        ${str(body.name, 200) || `${photoId}.jpg`}, ${key}, ${previewKey}, ${thumbKey}, 'center', ${width}, ${height}, ${size})
      returning ${tx.unsafe(PHOTO_COLUMNS)}`;
    if (!album.coverId && !album.coverKey) await tx`update albums set cover_id = ${photoId} where id = ${albumId}`;
    await tx`update albums set updated_at = now() where id = ${albumId}`;
    return { photo: toPhoto(photo as PhotoRow), coverId: album.coverId || (album.coverKey ? "" : photoId) };
  });
  if ("error" in result) {
    await deleteObjects(uploaded);
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result, 201);
});

albumRoutes.post("/uploads/cover", async (c) => {
  const { studioId, planId } = studioOf(c);
  const body = await c.req.json().catch(() => ({}));
  const ext = extensionOf(String(body.name || ""), String(body.type || ""));
  const size = Number(body.size) || 0;
  if (!ext || size <= 0) return c.json({ error: "Chỉ chấp nhận tệp JPG, PNG hoặc WEBP." }, 422);
  if (size > MAX_COVER_BYTES) return c.json({ error: "Ảnh bìa vượt quá 25 MB." }, 422);
  return asStudio(studioId, async (tx) => {
    const quota = await quotaError(tx, studioId, planId, size);
    if (quota) return c.json({ error: quota }, 422);
    const key = `studios/${studioId}/covers/${newId("cov")}.${ext}`;
    return c.json({ key, uploadUrl: await presignUpload(key) });
  });
});
