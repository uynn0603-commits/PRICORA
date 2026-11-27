import { invitationTemplateId } from "@/lib/invitation-catalog";
import { contentPhotoIds, normalizeContent, TRADITIONAL_TEMPLATE_ID } from "@/lib/invitation-content";
import type { Invitation, InvitationStatus, Photo } from "@/lib/types";
import type { Tx } from "./db";
import { PHOTO_COLUMNS, toPhoto, type PhotoRow } from "./data";

export interface InvitationRow {
  id: string;
  studioId: string;
  albumId: string | null;
  slug: string;
  status: InvitationStatus;
  templateId: string;
  groomName: string;
  brideName: string;
  groomParents: string;
  brideParents: string;
  weddingDate: string | null;
  weddingTime: string;
  venue: string;
  address: string;
  mapUrl: string;
  message: string;
  thankYou: string;
  musicUrl: string;
  photoIds: string[] | null;
  content: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// `date` columns arrive as Date objects; stringifying one gives "Sun Dec 20", not an ISO day.
function day(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const date = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${month}-${date}`;
  }
  const text = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : "";
}

export function toInvitation(row: InvitationRow): Invitation {
  return {
    id: row.id,
    studioId: row.studioId,
    albumId: row.albumId || "",
    slug: row.slug,
    status: row.status,
    templateId: invitationTemplateId(row.templateId),
    groomName: row.groomName,
    brideName: row.brideName,
    groomParents: row.groomParents,
    brideParents: row.brideParents,
    weddingDate: day(row.weddingDate),
    weddingTime: row.weddingTime,
    venue: row.venue,
    address: row.address,
    mapUrl: row.mapUrl,
    message: row.message,
    thankYou: row.thankYou,
    musicUrl: row.musicUrl,
    photoIds: row.photoIds || [],
    content: normalizeContent(row.content),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export interface PublicInvitation {
  invitation: Invitation;
  studioName: string;
  studioSlug: string;
  showBrand: boolean;
  photos: Photo[];
}

// Published invitations of an active studio. Drafts and suspended studios stay hidden.
export async function resolveInvitation(tx: Tx, studioSlug: string, slug: string): Promise<PublicInvitation | null> {
  const [row] = await tx<Array<InvitationRow & { studioName: string; studioSlug: string; planId: string }>>`
    select i.*, s.name as studio_name, s.slug as studio_slug, s.plan_id
    from invitations i
    join studios s on s.id = i.studio_id
    where s.slug = ${studioSlug} and s.status = 'active' and i.slug = ${slug} and i.status = 'published'`;
  if (!row) return null;
  const invitation = toInvitation(row);
  const ids = invitation.templateId === TRADITIONAL_TEMPLATE_ID ? contentPhotoIds(invitation.content) : invitation.photoIds;
  const found = ids.length
    ? await tx.unsafe<PhotoRow[]>(`select ${PHOTO_COLUMNS} from photos where studio_id = $1 and id = any($2::text[])`, [row.studioId, ids])
    : [];
  const byId = new Map(found.map((photo) => [photo.id, toPhoto(photo)]));
  return {
    invitation,
    studioName: row.studioName,
    studioSlug: row.studioSlug,
    showBrand: row.planId === "free",
    photos: ids.flatMap((id) => {
      const photo = byId.get(id);
      return photo ? [photo] : [];
    }),
  };
}
