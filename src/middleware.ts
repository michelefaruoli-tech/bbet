import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SECURITY_HEADERS } from "@/lib/security";

const PUBLIC_PATHS = ["/login", "/api/health"];

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

function withSecurityHeaders(response: NextResponse) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return withSecurityHeaders(NextResponse.next());
  }

  const token = request.cookies.get("bbet_session")?.value;
  const secret = getSecret();

  if (!token || !secret) {
    return withSecurityHeaders(NextResponse.redirect(new URL("/login", request.url)));
  }

  try {
    await jwtVerify(token, secret);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", request.nextUrl.pathname);
    return withSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }));
  } catch {
    return withSecurityHeaders(NextResponse.redirect(new URL("/login", request.url)));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
