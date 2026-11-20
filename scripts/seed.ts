import { db } from "@/server/db";
import { reseed } from "@/server/seed";

try {
  await reseed();
  console.log("demo data loaded");
} finally {
  await db().end();
}
