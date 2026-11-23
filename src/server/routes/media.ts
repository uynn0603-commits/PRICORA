import { Hono } from "hono";
import type { AppEnv } from "../auth";
import { env } from "../env";
import { contentTypeFor, isPrivateBucket, MAX_PHOTO_BYTES, readLocalObject, signedDownload, verifyLocalUpload, writeLocalObject } from "../storage";

// Local disk serves uploads and files here. A private bucket only needs /media/file, which
// redirects to a signed URL; with a public bucket the browser talks to it directly.
export const mediaRoutes = new Hono<AppEnv>();

mediaRoutes.put("/media/upload", async (c) => {
  if (env.storageDriver !== "local") return c.json({ error: "Not found" }, 404);
  const key = c.req.query("key") || "";
  const expires = Number(c.req.query("expires"));
  if (!verifyLocalUpload(key, expires, c.req.query("signature") || "")) return c.json({ error: "Liên kết tải lên không hợp lệ hoặc đã hết hạn." }, 403);
  const body = new Uint8Array(await c.req.arrayBuffer());
  if (!body.length || body.length > MAX_PHOTO_BYTES) return c.json({ error: "Tệp không hợp lệ." }, 413);
  await writeLocalObject(key, body);
  return c.body(null, 200);
});

mediaRoutes.get("/media/file/*", async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/api\/media\/file\//, ""));
  if (isPrivateBucket()) {
    const signed = await signedDownload(key);
    if (!signed) return c.json({ error: "Not found" }, 404);
    c.header("cache-control", `public, max-age=${signed.maxAge}, s-maxage=${signed.maxAge}`);
    return c.redirect(signed.url, 302);
  }
  if (env.storageDriver !== "local") return c.json({ error: "Not found" }, 404);
  const data = await readLocalObject(key);
  if (!data) return c.json({ error: "Not found" }, 404);
  return c.body(new Uint8Array(data), 200, {
    "content-type": contentTypeFor(key),
    "cache-control": "public, max-age=31536000, immutable",
  });
});
