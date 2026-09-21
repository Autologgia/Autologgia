import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const ACCESS_TTL_SECONDS = 10 * 60;

function secret() {
  const value = process.env.HISTORY_ACCESS_SECRET;
  if (!value || value.length < 32) {
    throw new Error("HISTORY_ACCESS_SECRET doit contenir au moins 32 caractères.");
  }
  return value;
}

export function historyAccessCookieName(slug: string) {
  return `autologgia_history_${createHash("sha256").update(slug).digest("hex").slice(0, 16)}`;
}

export function createHistoryAccessToken(slug: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ slug, expiresAt }), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return { token: `${payload}.${signature}`, maxAge: ACCESS_TTL_SECONDS };
}

export function verifyHistoryAccessToken(token: string | undefined, slug: string) {
  if (!token) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;
  const expected = createHmac("sha256", secret()).update(payload).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(signature, "base64url");
  } catch {
    return false;
  }
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      slug?: unknown;
      expiresAt?: unknown;
    };
    return parsed.slug === slug
      && typeof parsed.expiresAt === "number"
      && parsed.expiresAt >= Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
