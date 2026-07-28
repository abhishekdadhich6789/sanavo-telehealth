import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getSessionCookieName } from "@/lib/auth/session";
import { applySecurityHeaders } from "@/lib/security";

function getSecret() {
  const secret = process.env.JWT_SECRET || "dev-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

async function getUserFromRequest(request: NextRequest) {
  const token = request.cookies.get(getSessionCookieName())?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as { role: string; mustChangePassword?: boolean };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const user = await getUserFromRequest(request);

  let response: NextResponse = NextResponse.next();

  // Force password change before accessing partner portal
  if (pathname.startsWith("/doctor")) {
    if (!user) {
      response = NextResponse.redirect(new URL("/login?redirect=/doctor", request.url));
    } else if (user.role !== "doctor") {
      response = NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
    } else if (user.mustChangePassword) {
      response = NextResponse.redirect(new URL("/change-password", request.url));
    }
  } else if (pathname.startsWith("/admin")) {
    if (!user) {
      response = NextResponse.redirect(new URL("/login?redirect=/admin", request.url));
    } else if (user.role !== "admin") {
      response = NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
    } else if (user.mustChangePassword) {
      response = NextResponse.redirect(new URL("/change-password", request.url));
    }
  } else if (pathname.startsWith("/change-password")) {
    if (!user) {
      response = NextResponse.redirect(
        new URL("/login?redirect=/change-password", request.url)
      );
    }
  }

  return applySecurityHeaders(request, response);
}

export const config = {
  matcher: [
    /*
     * Apply security headers to all routes except static assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
