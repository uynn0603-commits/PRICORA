import { formatBytes, slugify } from "@/lib/format";
import type { Plan } from "@/lib/types";
import type { Tx } from "./db";
import { studioUsage } from "./data";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const RESERVED_SLUGS = new Set(["admin", "api", "app", "gallery", "login", "platform", "s", "signup", "templates", "www", "picora"]);

export const str = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max);

export async function studioSlugError(tx: Tx, slug: string, currentId?: string): Promise<string> {
  if (!slug) return "Vui lòng nhập địa chỉ studio.";
  if (slug.length < 3) return "Địa chỉ studio cần ít nhất 3 ký tự.";
  if (RESERVED_SLUGS.has(slug)) return "Địa chỉ này đã được hệ thống sử dụng.";
  const [taken] = await tx`select 1 from studios where slug = ${slug} and id <> ${currentId || ""}`;
  return taken ? "Địa chỉ này đã có studio khác sử dụng." : "";
}

export async function emailTaken(tx: Tx, email: string, exceptUserId = ""): Promise<boolean> {
  const [row] = await tx`select 1 from users where lower(email) = lower(${email}) and id <> ${exceptUserId}`;
  return Boolean(row);
}

// Returns the first limit a studio would break on the given plan, or "".
export async function planConflict(tx: Tx, studioId: string, plan: Plan): Promise<string> {
  const usage = await studioUsage(tx, studioId);
  if (usage.storage > plan.storage) return `Studio đang dùng ${formatBytes(usage.storage)}, vượt dung lượng ${formatBytes(plan.storage)} của gói ${plan.name}.`;
  if (plan.albums != null && usage.albums > plan.albums) return `Studio đang có ${usage.albums} album, vượt giới hạn ${plan.albums} album của gói ${plan.name}.`;
  if (usage.members > plan.members) return `Studio đang có ${usage.members} thành viên, vượt giới hạn ${plan.members} của gói ${plan.name}.`;
  return "";
}

export async function uniqueAlbumSlug(tx: Tx, base: string, studioId: string): Promise<string> {
  const root = slugify(base) || "album";
  const rows = await tx<Array<{ slug: string }>>`select slug from albums where studio_id = ${studioId} and (slug = ${root} or slug like ${`${root}-%`})`;
  const taken = new Set(rows.map((row) => row.slug));
  let candidate = root;
  for (let count = 2; taken.has(candidate); count += 1) candidate = `${root}-${count}`;
  return candidate;
}

export { slugify };
