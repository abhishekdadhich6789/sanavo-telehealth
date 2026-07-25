import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/auth/users";
import { UserRole } from "@/lib/auth/types";
import {
  createSessionToken,
  getSessionCookieName,
  SESSION_MAX_AGE,
} from "@/lib/auth/session";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const limited = rateLimit({
    key: clientKey(request, "login"),
    limit: 10,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await verifyCredentials(email, password);
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const role = user.role as UserRole;
    const mustChangePassword = !!user.mustChangePassword;

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      role,
      name: user.name,
      mustChangePassword,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role,
        name: user.name,
        mustChangePassword,
      },
    });

    response.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
