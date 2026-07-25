import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { changePassword } from "@/lib/auth/users";
import { validatePasswordStrength } from "@/lib/auth/password";
import {
  createSessionToken,
  getSessionCookieName,
  getSessionUser,
  SESSION_MAX_AGE,
} from "@/lib/auth/session";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const limited = rateLimit({
    key: clientKey(request, "change-password"),
    limit: 10,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const auth = await requireAuth(["doctor", "admin"], {
    allowPasswordChangePending: true,
  });
  if (auth instanceof NextResponse) return auth;

  try {
    const { currentPassword, newPassword, confirmPassword } = await request.json();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "All password fields are required" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirmation do not match" },
        { status: 400 }
      );
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.ok) {
      return NextResponse.json({ error: strength.error }, { status: 400 });
    }

    const result = await changePassword(auth.id, currentPassword, newPassword);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Refresh session cookie without mustChangePassword flag
    const session = await getSessionUser();
    const response = NextResponse.json({ success: true });

    if (session) {
      const token = await createSessionToken({
        id: session.id,
        email: session.email,
        role: session.role,
        name: session.name,
        mustChangePassword: false,
      });

      response.cookies.set(getSessionCookieName(), token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE,
        path: "/",
      });
    }

    return response;
  } catch {
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
