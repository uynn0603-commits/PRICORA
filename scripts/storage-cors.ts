import { createHash } from "node:crypto";
import { AwsClient } from "aws4fetch";

// Lets browsers on the given origins PUT uploads to and GET downloads from the bucket.
// Usage: npm run storage:cors -- https://your-domain.vn [http://localhost:5173 ...]
const origins = process.argv.slice(2).map((origin) => origin.replace(/\/+$/, ""));
if (!origins.length || origins.some((origin) => !/^https?:\/\/[^/]+$/.test(origin))) {
  throw new Error("Pass the app origins, e.g. npm run storage:cors -- https://picora.vercel.app");
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

const endpoint = required("S3_ENDPOINT").replace(/\/+$/, "");
const bucket = required("S3_BUCKET");
const client = new AwsClient({
  accessKeyId: required("S3_ACCESS_KEY_ID"),
  secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
  region: process.env.S3_REGION || "auto",
  service: "s3",
});

const body =
  '<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><CORSRule>' +
  origins.map((origin) => `<AllowedOrigin>${origin}</AllowedOrigin>`).join("") +
  "<AllowedMethod>GET</AllowedMethod><AllowedMethod>PUT</AllowedMethod>" +
  "<AllowedHeader>content-type</AllowedHeader><MaxAgeSeconds>3600</MaxAgeSeconds>" +
  "</CORSRule></CORSConfiguration>";

const url = `${endpoint}/${bucket}?cors`;
const response = await client.fetch(url, {
  method: "PUT",
  body,
  headers: { "content-type": "application/xml", "content-md5": createHash("md5").update(body).digest("base64") },
});
if (!response.ok) throw new Error(`PutBucketCors failed (${response.status}): ${await response.text()}`);

const check = await client.fetch(url);
console.log(`CORS for ${bucket} now allows: ${origins.join(", ")}`);
console.log(await check.text());
