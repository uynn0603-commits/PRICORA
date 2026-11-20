import { mkdir, open, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { AwsClient } from "aws4fetch";
import { sign, safeEqual } from "./crypto";
import { env } from "./env";

// Every object key starts with studios/<studioId>/ (album files) or users/<userId>/ (profile
// photos), so a studio or account can never be handed a signed URL inside another's prefix.
const KEY_RE = /^(studios|users)\/[A-Za-z0-9_-]+\/[A-Za-z0-9_\/.-]+$/;
const UPLOAD_TTL = 15 * 60;

export const MAX_PHOTO_BYTES = 60 * 1024 * 1024;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function isValidKey(key: string): boolean {
  return KEY_RE.test(key) && !key.includes("..");
}

export function contentTypeFor(key: string): string {
  return CONTENT_TYPES[key.split(".").pop()?.toLowerCase() || ""] || "application/octet-stream";
}

/* ---------- S3 / Cloudflare R2 ---------- */

function s3Client() {
  const { accessKeyId, secretAccessKey, region } = env.s3;
  return new AwsClient({ accessKeyId, secretAccessKey, region, service: "s3" });
}

function s3Url(key: string) {
  const { endpoint, bucket } = env.s3;
  return `${endpoint}/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/* ---------- Local disk (development) ---------- */

const LOCAL_ROOT = path.join(process.cwd(), ".data", "media");

function localPath(key: string) {
  if (!isValidKey(key)) throw new Error("Invalid storage key");
  return path.join(LOCAL_ROOT, ...key.split("/"));
}

function uploadSignature(key: string, expires: number) {
  return sign(`put:${key}:${expires}`, env.sessionSecret);
}

export function verifyLocalUpload(key: string, expires: number, signature: string): boolean {
  return isValidKey(key) && expires > Date.now() / 1000 && safeEqual(uploadSignature(key, expires), signature);
}

export async function writeLocalObject(key: string, body: Uint8Array) {
  const file = localPath(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
}

export async function readLocalObject(key: string): Promise<Buffer | null> {
  try {
    return await readFile(localPath(key));
  } catch {
    return null;
  }
}

/* ---------- Driver-independent API ---------- */

export async function presignUpload(key: string): Promise<string> {
  if (!isValidKey(key)) throw new Error("Invalid storage key");
  if (env.storageDriver === "local") {
    const expires = Math.floor(Date.now() / 1000) + UPLOAD_TTL;
    const query = new URLSearchParams({ key, expires: String(expires), signature: uploadSignature(key, expires) });
    return `/api/media/upload?${query}`;
  }
  const url = new URL(s3Url(key));
  url.searchParams.set("X-Amz-Expires", String(UPLOAD_TTL));
  const signed = await s3Client().sign(new Request(url, { method: "PUT" }), { aws: { signQuery: true } });
  return signed.url;
}

export async function objectSize(key: string): Promise<number | null> {
  if (!isValidKey(key)) return null;
  if (env.storageDriver === "local") {
    try {
      return (await stat(localPath(key))).size;
    } catch {
      return null;
    }
  }
  const response = await s3Client().fetch(s3Url(key), { method: "HEAD" });
  return response.ok ? Number(response.headers.get("content-length") || 0) : null;
}

async function objectPrefix(key: string, length: number): Promise<Uint8Array | null> {
  if (env.storageDriver === "local") {
    try {
      const handle = await open(localPath(key));
      try {
        const buffer = Buffer.alloc(length);
        const { bytesRead } = await handle.read(buffer, 0, length, 0);
        return buffer.subarray(0, bytesRead);
      } finally {
        await handle.close();
      }
    } catch {
      return null;
    }
  }
  const response = await s3Client().fetch(s3Url(key), { headers: { range: `bytes=0-${length - 1}` } });
  return response.ok ? new Uint8Array(await response.arrayBuffer()).subarray(0, length) : null;
}

// The browser chooses what it PUTs to a presigned URL, so the file signature is checked
// before the object is attached to an album.
export async function isImageObject(key: string): Promise<boolean> {
  const bytes = await objectPrefix(key, 12);
  if (!bytes || bytes.length < 12) return false;
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes[0] === 0x89 && ascii(1, 4) === "PNG";
  const webp = ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  return jpeg || png || webp;
}

export async function deleteObjects(keys: string[]) {
  const valid = keys.filter((key) => key && isValidKey(key));
  if (env.storageDriver === "local") {
    await Promise.allSettled(valid.map((key) => rm(localPath(key), { force: true })));
    return;
  }
  const client = s3Client();
  await Promise.allSettled(valid.map((key) => client.fetch(s3Url(key), { method: "DELETE" })));
}

export function publicUrl(key: string): string {
  if (!key) return "";
  if (env.storageDriver === "local") return `/api/media/file/${key}`;
  return `${env.mediaPublicUrl}/${key}`;
}
