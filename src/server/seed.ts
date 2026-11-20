import { createSeed } from "@/lib/mock";
import { hashPassword } from "./crypto";
import { asSystem } from "./db";
import { deleteObjects } from "./storage";

const CHUNK = 500;

// Wipes every studio and loads the demo platform from src/lib/mock.ts. `keepSession`
// re-creates that session afterwards so whoever pressed reset stays signed in.
export async function reseed({ keepSession }: { keepSession?: string } = {}) {
  const seed = createSeed();
  const passwords = new Map<string, string>();
  for (const user of seed.users) passwords.set(user.id, await hashPassword(user.password || "123456"));

  const orphaned = await asSystem(async (tx) => {
    const [session] = keepSession
      ? await tx<Array<{ userId: string; studioId: string | null; expiresAt: Date }>>`
          select user_id, studio_id, expires_at from sessions where token_hash = ${keepSession}`
      : [];
    const files = await tx<Array<{ key: string }>>`
      select unnest(array[storage_key, preview_key, thumb_key]) as key from photos where storage_key is not null
      union all select cover_key from albums where cover_key <> ''`;

    await tx`delete from album_selections`;
    await tx`delete from photos`;
    await tx`delete from albums`;
    await tx`delete from memberships`;
    await tx`delete from sessions`;
    await tx`delete from studios`;
    await tx`delete from users`;

    await tx`insert into users ${tx(
      seed.users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        password_hash: passwords.get(user.id)!,
        platform_admin: Boolean(user.platformAdmin),
      })),
    )}`;
    await tx`insert into studios ${tx(
      seed.studios.map((studio) => ({
        id: studio.id,
        slug: studio.slug,
        name: studio.name,
        plan_id: studio.planId,
        status: studio.status,
        settings: tx.json(studio.settings),
        created_at: studio.createdAt,
      })),
    )}`;
    await tx`insert into memberships ${tx(
      seed.memberships.map((member) => ({ user_id: member.userId, studio_id: member.studioId, role: member.role, created_at: member.createdAt })),
    )}`;
    await tx`insert into albums ${tx(
      seed.albums.map((album) => ({
        id: album.id,
        studio_id: album.studioId,
        slug: album.slug,
        name: album.name,
        customer_name: album.customerName,
        customer_phone: album.customerPhone,
        occasion: album.occasion,
        shooting_date: album.shootingDate || null,
        description: album.description,
        cover_id: album.coverId,
        password: album.password,
        expires_at: album.expiresAt || null,
        status: album.status,
        template_id: album.templateId,
        allow_download: album.allowDownload,
        selection_enabled: album.selectionEnabled,
        selection_limit: album.selectionLimit || null,
        created_at: album.createdAt,
        updated_at: album.updatedAt,
      })),
    )}`;
    const selections = seed.albums.filter((album) => album.selection);
    if (selections.length) {
      await tx`insert into album_selections ${tx(
        selections.map((album) => ({
          album_id: album.id,
          studio_id: album.studioId,
          photo_ids: album.selection!.photoIds,
          note: album.selection!.note,
          submitted_at: album.selection!.submittedAt,
        })),
      )}`;
    }
    const photos = seed.albums.flatMap((album) =>
      album.photos.map((photo, index) => ({
        id: photo.id,
        album_id: album.id,
        studio_id: album.studioId,
        position: index + 1,
        name: photo.name,
        unsplash: photo.unsplash || null,
        focal: photo.fp || "center",
        width: photo.w,
        height: photo.h,
        size: photo.size,
        uploaded_at: photo.uploadedAt,
      })),
    );
    for (let start = 0; start < photos.length; start += CHUNK) {
      await tx`insert into photos ${tx(photos.slice(start, start + CHUNK))}`;
    }

    if (session && seed.users.some((user) => user.id === session.userId)) {
      const studioStillExists = seed.studios.some((studio) => studio.id === session.studioId);
      await tx`
        insert into sessions (token_hash, user_id, studio_id, expires_at)
        values (${keepSession!}, ${session.userId}, ${studioStillExists ? session.studioId : null}, ${session.expiresAt})`;
    }
    return files.map((file) => file.key);
  });
  await deleteObjects(orphaned);
}
