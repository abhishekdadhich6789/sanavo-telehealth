import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import {
  resetDoctorPassword,
  toggleDoctorActive,
  toPublicUser,
} from "@/lib/auth/users";
import { validatePasswordStrength } from "@/lib/auth/password";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const body = await request.json();

    if (typeof body.resetPassword === "string") {
      const strength = validatePasswordStrength(body.resetPassword);
      if (!strength.ok) {
        return NextResponse.json({ error: strength.error }, { status: 400 });
      }

      const result = await resetDoctorPassword(id, body.resetPassword);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }

      return NextResponse.json({
        ...toPublicUser(result.user),
        passwordReset: true,
      });
    }

    if (typeof body.active === "boolean") {
      const doctor = await toggleDoctorActive(id, body.active);
      if (!doctor) {
        return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
      }
      return NextResponse.json(toPublicUser(doctor));
    }

    return NextResponse.json(
      { error: "Provide active (boolean) or resetPassword (string)" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json({ error: "Failed to update doctor" }, { status: 500 });
  }
}
