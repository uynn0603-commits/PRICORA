import postgres from "postgres";
import { env } from "./env";

export type Sql = postgres.Sql;
export type Tx = postgres.TransactionSql;

// One pool per server process; Next's dev server reloads modules, so keep it on globalThis.
const holder = globalThis as unknown as { picoraSql?: Sql };

export function db(): Sql {
  if (!holder.picoraSql) {
    holder.picoraSql = postgres(env.databaseUrl, {
      max: Number(process.env.DATABASE_POOL_MAX) || 5,
      idle_timeout: 20,
      onnotice: () => {},
      transform: { column: { from: postgres.toCamel } },
      connection: { TimeZone: env.timezone },
    });
  }
  return holder.picoraSql;
}

// Row-level security only lets this transaction see rows of `studioId`.
export async function asStudio<T>(studioId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return (await db().begin(async (tx) => {
    await tx`select set_config('app.studio_id', ${studioId}, true)`;
    return fn(tx);
  })) as T;
}

// Cross-studio access for sign-in, public galleries and the platform console.
export async function asSystem<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return (await db().begin(async (tx) => {
    await tx`select set_config('app.bypass', 'on', true)`;
    return fn(tx);
  })) as T;
}
