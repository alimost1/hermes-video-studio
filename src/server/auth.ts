import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
export function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function sessionToken(secret: string, expires: number) {
  const value = String(expires);
  return `${value}.${createHmac("sha256", secret).update(value).digest("hex")}`;
}
export function authorized(req: NextRequest) {
  const secret = process.env.STUDIO_TOKEN;
  if (!secret || secret.length < 32) return false;
  const bearer = req.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) return equal(bearer.slice(7), secret);
  const cookie = req.cookies.get("studio-session")?.value;
  if (!cookie) return false;
  const expires = Number(cookie.split(".")[0]);
  return (
    Number.isFinite(expires) &&
    expires > Date.now() &&
    equal(cookie, sessionToken(secret, expires))
  );
}
export function sameOrigin(req: NextRequest) {
  if (req.headers.get("authorization")?.startsWith("Bearer ")) return true;
  const origin = req.headers.get("origin");
  return (
    !!origin && origin === (process.env.APP_ORIGIN || new URL(req.url).origin)
  );
}
