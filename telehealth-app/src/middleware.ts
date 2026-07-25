import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getSessionCookieName } from "@/lib/auth/session";

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

  // Force password change before accessing partner portal
  if (pathname.startsWith("/doctor")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login?redirect=/doctor", request.url));
    }
    if (user.role !== "doctor") {
      return NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
    }
    if (user.mustChangePassword) {
      return NextResponse.redirect(new URL("/change-password", request.url));
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login?redirect=/admin", request.url));
    }
    if (user.role !== "admin") {
      return NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
    }
  }

  // Change-password page requires login
  if (pathname.startsWith("/change-password")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login?redirect=/change-password", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/doctor/:path*", "/admin/:path*", "/change-password"],
};
