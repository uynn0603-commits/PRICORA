import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

// Runs as the schema owner. Also makes sure the runtime login from DATABASE_URL exists and
// belongs to picora_app, so the app itself never connects as the owner (which bypasses RLS).
const ownerUrl = process.env.MIGRATION_DATABASE_URL;
const appUrl = process.env.DATABASE_URL;
if (!ownerUrl || !appUrl) throw new Error("Set MIGRATION_DATABASE_URL and DATABASE_URL (see .env.example).");

const sql = postgres(ownerUrl, { max: 1, onnotice: () => {} });
const dir = path.join(process.cwd(), "db", "migrations");

const literal = (value: string) => `'${value.replace(/'/g, "''")}'`;
const ident = (value: string) => `"${value.replace(/"/g, '""')}"`;

try {
  await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const applied = new Set((await sql<Array<{ name: string }>>`select name from schema_migrations`).map((row) => row.name));
  const files = (await readdir(dir)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const content = await readFile(path.join(dir, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`insert into schema_migrations (name) values (${file})`;
    });
    console.log(`applied ${file}`);
  }

  const app = new URL(appUrl);
  const owner = new URL(ownerUrl);
  const role = decodeURIComponent(app.username);
  if (role && role !== decodeURIComponent(owner.username)) {
    const password = decodeURIComponent(app.password);
    const [exists] = await sql`select 1 from pg_roles where rolname = ${role}`;
    await sql.unsafe(`${exists ? "alter" : "create"} role ${ident(role)} login password ${literal(password)}`);
    await sql.unsafe(`grant picora_app to ${ident(role)}`);
    console.log(`runtime role ${role} ready`);
  }
  console.log("database is up to date");
} finally {
  await sql.end();
}
