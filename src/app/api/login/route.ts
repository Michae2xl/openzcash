/**
 * POST /api/login — autentica o admin por senha e emite o cookie de sessão.
 * Comparação em tempo constante; cookie httpOnly assinado (HMAC); rate-limit por IP.
 */

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createSession, SESSION_COOKIE } from "@/lib/auth/session";
import { clearRateLimit, hitRateLimit } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rl = hitRateLimit(`login:${ip}`);
  if (!rl.allowed)
    return Response.json(
      {
        ok: false,
        error: `Too many attempts. Try again in ${rl.retryAfterSec}s.`,
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );

  const { password } = (await req.json()) as { password?: string };
  const expected = process.env.ADMIN_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!expected || !secret)
    return Response.json(
      { ok: false, error: "Authentication is not configured on the server." },
      { status: 500 },
    );

  const a = Buffer.from(password ?? "", "utf8");
  const b = Buffer.from(expected, "utf8");
  const match = a.length === b.length && timingSafeEqual(a, b);
  if (!match)
    return Response.json(
      { ok: false, error: "Incorrect password." },
      { status: 401 },
    );

  clearRateLimit(`login:${ip}`);
  const token = await createSession(secret);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  return Response.json({ ok: true });
}
