/**
 * Sessão de admin via cookie assinado (HMAC-SHA256, WebCrypto — roda no middleware
 * edge e no server Node). Sem estado: o cookie é `<payload>.<assinatura>`, onde
 * payload = base64url({exp}); a assinatura prova autenticidade e a expiração limita
 * a validade. Não há tabela de sessões.
 */

export const SESSION_COOKIE = "zec_session";
const TTL_MS = 12 * 60 * 60 * 1000; // 12h

const enc = new TextEncoder();
const dec = new TextDecoder();

/** Bytes em um ArrayBuffer concreto (satisfaz BufferSource do WebCrypto). */
function u8(data: string | Uint8Array): Uint8Array<ArrayBuffer> {
  const src = typeof data === "string" ? enc.encode(data) : data;
  const out = new Uint8Array(new ArrayBuffer(src.byteLength));
  out.set(src);
  return out;
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const norm = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = norm.length % 4 ? 4 - (norm.length % 4) : 0;
  const bin = atob(norm + "=".repeat(pad));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    u8(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSession(secret: string): Promise<string> {
  const payload = b64url(u8(JSON.stringify({ exp: Date.now() + TTL_MS })));
  const sig = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    u8(payload),
  );
  return `${payload}.${b64url(new Uint8Array(sig))}`;
}

export async function verifySession(
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!token || !secret) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  let ok = false;
  try {
    ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      fromB64url(sig),
      u8(payload),
    );
  } catch {
    return false;
  }
  if (!ok) return false;
  try {
    const parsed = JSON.parse(dec.decode(fromB64url(payload))) as {
      exp?: number;
    };
    return typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}
