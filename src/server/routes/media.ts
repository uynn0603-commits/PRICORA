import { Hono } from "hono";
import type { AppEnv } from "../auth";
import { env } from "../env";
import { contentTypeFor, MAX_PHOTO_BYTES, readLocalObject, verifyLocalUpload, writeLocalObject } from "../storage";

// Only used with STORAGE_DRIVER=local; with S3/R2 the browser talks to the bucket directly.
export const mediaRoutes = new Hono<AppEnv>();

mediaRoutes.use("/media/*", async (c, next) => {
  if (env.storageDriver !== "local") return c.json({ error: "Not found" }, 404);
  await next();
});

mediaRoutes.put("/media/upload", async (c) => {
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
  const data = await readLocalObject(key);
  if (!data) return c.json({ error: "Not found" }, 404);
  return c.body(new Uint8Array(data), 200, {
    "content-type": contentTypeFor(key),
    "cache-control": "public, max-age=31536000, immutable",
  });
});
