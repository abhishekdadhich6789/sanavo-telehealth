import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { createDoctor, getDoctors, toPublicUser } from "@/lib/auth/users";
import { createDoctorSchema } from "@/lib/validators";

export async function GET() {
  const auth = await requireAuth(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const doctors = await getDoctors();
  return NextResponse.json(doctors.map(toPublicUser));
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const parsed = createDoctorSchema.safeParse(body);

    if (!parsed.success) {
      const firstError =
        Object.values(parsed.error.flatten().fieldErrors).flat()[0] ||
        "Invalid partner details";
      return NextResponse.json(
        { error: firstError, details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, name, nmcNumber, phone } = parsed.data;

    const doctor = await createDoctor(
      {
        email,
        password,
        name,
        nmcNumber,
        phone: phone || undefined,
      },
      auth.id
    );

    return NextResponse.json(toPublicUser(doctor), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create doctor";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
