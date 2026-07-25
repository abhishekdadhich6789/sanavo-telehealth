import { NextResponse } from "next/server";
import { getAllRequests, getRequestsForDoctor } from "@/lib/store";
import { requireAuth } from "@/lib/auth/guard";

export async function GET() {
  const auth = await requireAuth(["doctor", "admin"]);
  if (auth instanceof NextResponse) return auth;

  if (auth.role === "admin") {
    const requests = await getAllRequests();
    return NextResponse.json(requests);
  }

  const requests = await getRequestsForDoctor(auth.id);
  return NextResponse.json(requests);
}

export async function POST() {
  return NextResponse.json(
    { error: "Payment required. Complete checkout via /api/payments/verify." },
    { status: 403 }
  );
}
