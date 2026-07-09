/**
 * Cookie-based session for the single admin user. No sessions table -
 * the cookie value is an HMAC of a fixed string keyed by ADMIN_PASSWORD,
 * so it's stateless and invalidated automatically whenever the password
 * changes. Uses Web Crypto so it works in both the Edge proxy and Node.
 */

export const ADMIN_SESSION_COOKIE = "admin_session";

async function hmac(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function computeSessionToken(adminPassword: string): Promise<string> {
  return hmac(adminPassword, "kinosan-admin-session-v1");
}
