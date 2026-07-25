import { NextRequest, NextResponse } from "next/server";
import { getRequestByAccessToken, getRequestById, updateRequest } from "@/lib/store";
import { requireAuth } from "@/lib/auth/guard";
import { updateRequestSchema } from "@/lib/validators";
import { getUserById } from "@/lib/auth/users";
import { generateCertificate } from "@/lib/services/certificates";
import {
  notifyCertificateApproved,
  notifyConsultationComplete,
  notifyNeedsFollowup,
  notifyRequestDeclined,
  notifyTelehealthSlotConfirmed,
} from "@/lib/services/notifications";
import { prisma } from "@/lib/db";

function assertDoctorOwnsRequest(
  existing: { assignedDoctorId?: string | null },
  doctorId: string
): NextResponse | null {
  if (existing.assignedDoctorId && existing.assignedDoctorId !== doctorId) {
    return NextResponse.json(
      { error: "This request is assigned to another doctor" },
      { status: 403 }
    );
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = request.nextUrl.searchParams.get("token");

  // Full details only with access token (patient status page)
  if (token) {
    const consultRequest = await getRequestByAccessToken(id, token);
    if (!consultRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const messages = await prisma.notification.findMany({
      where: { requestId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      ...consultRequest,
      messages: messages.map((m) => ({
        id: m.id,
        channel: m.channel,
        subject: m.subject,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  }

  // Without token: partner/admin only
  const auth = await requireAuth(["doctor", "admin"]);
  if (auth instanceof NextResponse) return auth;

  const consultRequest = await getRequestById(id);
  if (!consultRequest) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (
    auth.role === "doctor" &&
    consultRequest.assignedDoctorId &&
    consultRequest.assignedDoctorId !== auth.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(consultRequest);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["doctor"]);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = updateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates = parsed.data;
    const existing = await getRequestById(id);
    if (!existing) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const ownershipError = assertDoctorOwnsRequest(existing, auth.id);
    if (ownershipError) return ownershipError;

    // Medical certs in shared queue must be claimed first
    if (
      existing.type === "medical_certificate" &&
      !existing.assignedDoctorId &&
      updates.status &&
      updates.status !== "under_review"
    ) {
      return NextResponse.json(
        { error: "Claim this request before updating it" },
        { status: 400 }
      );
    }

    const doctor = await getUserById(auth.id);
    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    if (updates.status === "approved" && existing.type === "medical_certificate") {
      const days = Math.min(
        updates.approvedDays ?? existing.medicalCertificate?.daysNeeded ?? 1,
        2
      );
      const certificate = await generateCertificate(existing, doctor, days);

      const updated = await updateRequest(
        id,
        {
          status: "approved",
          approvedDays: days,
          doctorNotes: updates.doctorNotes,
          assignedDoctorId: auth.id,
          certificate,
        },
        auth
      );

      if (updated) {
        await notifyCertificateApproved(
          id,
          updated.patient.phone,
          updated.patient.email,
          certificate,
          updated.accessToken
        );
      }

      return NextResponse.json(updated);
    }

    if (updates.status === "declined") {
      if (!updates.declineReason) {
        return NextResponse.json(
          { error: "Decline reason is required" },
          { status: 400 }
        );
      }

      const updated = await updateRequest(
        id,
        {
          status: "declined",
          declineReason: updates.declineReason,
          doctorNotes: updates.doctorNotes,
          assignedDoctorId: auth.id,
        },
        auth
      );

      if (updated) {
        await notifyRequestDeclined(
          id,
          updated.patient.phone,
          updated.patient.email,
          updates.declineReason
        );
      }

      return NextResponse.json(updated);
    }

    if (updates.status === "needs_followup") {
      const note =
        updates.doctorNotes?.trim() ||
        "Please check your email / status page for more details from the doctor.";

      const updated = await updateRequest(
        id,
        {
          status: "needs_followup",
          doctorNotes: note,
          assignedDoctorId: auth.id,
        },
        auth
      );

      if (updated) {
        await notifyNeedsFollowup(
          id,
          updated.patient.phone,
          updated.patient.email,
          `${updated.patient.firstName} ${updated.patient.lastName}`,
          note,
          updated.accessToken
        );
      }

      return NextResponse.json(updated);
    }

    if (updates.status === "scheduled" && existing.type === "telehealth") {
      if (!updates.telehealthSlot?.scheduledAt) {
        return NextResponse.json(
          { error: "Consultation slot date/time is required" },
          { status: 400 }
        );
      }

      const slot = {
        scheduledAt: updates.telehealthSlot.scheduledAt,
        doctorName: updates.telehealthSlot.doctorName || doctor.name,
        doctorPhone: updates.telehealthSlot.doctorPhone || doctor.phone || undefined,
        notes: updates.telehealthSlot.notes || updates.doctorNotes,
      };

      const updated = await updateRequest(
        id,
        {
          status: "scheduled",
          doctorNotes: updates.doctorNotes,
          assignedDoctorId: auth.id,
          telehealthSlot: slot,
        },
        auth
      );

      if (updated) {
        await notifyTelehealthSlotConfirmed(
          id,
          updated.patient.phone,
          updated.patient.email,
          `${updated.patient.firstName} ${updated.patient.lastName}`,
          slot,
          updated.accessToken
        );
      }

      return NextResponse.json(updated);
    }

    if (updates.status === "completed" && existing.type === "telehealth") {
      const updated = await updateRequest(
        id,
        {
          status: "completed",
          doctorNotes: updates.doctorNotes,
          assignedDoctorId: auth.id,
        },
        auth
      );

      if (updated) {
        await notifyConsultationComplete(
          id,
          updated.patient.phone,
          updated.patient.email,
          `${updated.patient.firstName} ${updated.patient.lastName}`
        );
      }

      return NextResponse.json(updated);
    }

    const updated = await updateRequest(
      id,
      {
        ...updates,
        assignedDoctorId: updates.assignedDoctorId ?? auth.id,
      },
      auth
    );

    if (!updated) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}
