import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/auth/users";
import { UserRole } from "@/lib/auth/types";
import {
  createSessionToken,
  getSessionCookieName,
  getSessionCookieOptions,
} from "@/lib/auth/session";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const limited = rateLimit({
    key: clientKey(request, "login"),
    limit: 5,
    windowMs: 15 * 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Constant-ish delay to slow credential stuffing a bit
    const started = Date.now();
    const user = await verifyCredentials(email, password);
    const elapsed = Date.now() - started;
    if (elapsed < 300) {
      await new Promise((r) => setTimeout(r, 300 - elapsed));
    }

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

    response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions());

    return response;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
