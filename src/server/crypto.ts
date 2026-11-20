import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ITERATIONS = 100_000;
const encoder = new TextEncoder();

const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(randomBytes(16));
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(await derive(password, salt, ITERATIONS))}`;
}

// A fixed hash to verify against when the email is unknown, so both cases take as long.
const DECOY = "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const [scheme, rounds, salt, hash] = (stored || DECOY).split("$");
  if (scheme !== "pbkdf2" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = Buffer.from(await derive(password, Buffer.from(salt, "base64url"), Number(rounds)));
  return Boolean(stored) && expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(9).toString("base64url").replace(/[-_]/g, "x")}`;
}
