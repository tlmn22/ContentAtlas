/**
 * Signed session cookies for multi-user admin login (admin_users table).
 * The cookie carries { username, exp } plus an HMAC signature keyed by
 * ADMIN_SESSION_SECRET, so the Edge proxy can verify it on every request
 * without a database round trip. Uses Web Crypto so it works in both the
 * Edge proxy and Node (server actions).
 */

export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AdminSessionPayload {
  username: string;
  exp: number;
}

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

// btoa/atob (not Buffer) so this works in both the Edge proxy and Node.
function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const padLen = (4 - (s.length % 4)) % 4;
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** Builds a signed "payload.signature" cookie value for a freshly logged-in user. */
export async function createSessionToken(username: string): Promise<string> {
  const secret = requireSecret();
  const payload: AdminSessionPayload = { username, exp: Date.now() + SESSION_TTL_MS };
  const encoded = b64urlEncode(JSON.stringify(payload));
  const sig = await hmac(secret, encoded);
  return `${encoded}.${sig}`;
}

/** Verifies signature + expiry; returns the payload if valid, else null. */
export async function verifySessionToken(token: string | undefined): Promise<AdminSessionPayload | null> {
  if (!token) return null;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;

  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;

  const expected = await hmac(secret, encoded);
  if (sig !== expected) return null;

  try {
    const payload = JSON.parse(b64urlDecode(encoded)) as AdminSessionPayload;
    if (typeof payload.username !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function requireSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET тохируулагдаагүй байна");
  return secret;
}
