import { prisma } from "./db";
import { mapDbRequestToConsult } from "./mappers";
import { ConsultRequest } from "./types";

export async function getAllRequests(): Promise<ConsultRequest[]> {
  const rows = await prisma.consultRequest.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapDbRequestToConsult);
}

export async function getRequestById(id: string): Promise<ConsultRequest | null> {
  const row = await prisma.consultRequest.findUnique({ where: { id } });
  return row ? mapDbRequestToConsult(row) : null;
}

export async function getRequestByAccessToken(
  id: string,
  token: string
): Promise<ConsultRequest | null> {
  const row = await prisma.consultRequest.findFirst({
    where: { id, accessToken: token },
  });
  return row ? mapDbRequestToConsult(row) : null;
}

export async function createRequest(
  request: Omit<ConsultRequest, "id" | "createdAt" | "updatedAt" | "status" | "accessToken">
): Promise<ConsultRequest> {
  // Telehealth: assign to the doctor the patient selected
  // Medical certificate: leave unassigned — first partner to claim wins (speed-based)
  const assignedDoctorId =
    request.type === "telehealth" && request.telehealth?.preferredDoctorId
      ? request.telehealth.preferredDoctorId
      : request.assignedDoctorId ?? null;

  const row = await prisma.consultRequest.create({
    data: {
      type: request.type,
      status: "pending",
      patientJson: JSON.stringify(request.patient),
      medicalCertificate: request.medicalCertificate
        ? JSON.stringify(request.medicalCertificate)
        : null,
      telehealth: request.telehealth ? JSON.stringify(request.telehealth) : null,
      paymentJson: request.payment ? JSON.stringify(request.payment) : null,
      assignedDoctorId,
      statusHistory: {
        create: {
          toStatus: "pending",
          note:
            request.type === "telehealth"
              ? `Request submitted — preferred doctor: ${request.telehealth?.preferredDoctorName || "selected"}`
              : "Request submitted — waiting for fastest available partner doctor",
        },
      },
    },
  });

  return mapDbRequestToConsult(row);
}

/** First doctor to claim an unassigned medical certificate wins */
export async function claimRequest(
  id: string,
  doctorId: string
): Promise<{ ok: true; request: ConsultRequest } | { ok: false; error: string }> {
  const existing = await prisma.consultRequest.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Request not found" };

  if (existing.type === "telehealth") {
    if (existing.assignedDoctorId !== doctorId) {
      return { ok: false, error: "This consultation is assigned to another doctor" };
    }
  } else if (existing.type === "medical_certificate") {
    if (existing.assignedDoctorId && existing.assignedDoctorId !== doctorId) {
      return {
        ok: false,
        error: "Another doctor already claimed this certificate request",
      };
    }
  }

  if (
    existing.type === "medical_certificate" &&
    !existing.assignedDoctorId &&
    existing.status === "pending"
  ) {
    // Atomic-ish claim: only update if still unassigned
    const result = await prisma.consultRequest.updateMany({
      where: { id, assignedDoctorId: null, status: "pending" },
      data: { assignedDoctorId: doctorId, status: "under_review" },
    });

    if (result.count === 0) {
      return {
        ok: false,
        error: "Another doctor claimed this request first — be faster next time!",
      };
    }

    await prisma.statusHistory.create({
      data: {
        requestId: id,
        fromStatus: "pending",
        toStatus: "under_review",
        actorId: doctorId,
        actorRole: "doctor",
        note: "Claimed from shared certificate queue",
      },
    });
  } else if (
    existing.status === "pending" &&
    existing.assignedDoctorId === doctorId
  ) {
    await prisma.consultRequest.update({
      where: { id },
      data: { status: "under_review" },
    });
    await prisma.statusHistory.create({
      data: {
        requestId: id,
        fromStatus: "pending",
        toStatus: "under_review",
        actorId: doctorId,
        actorRole: "doctor",
        note: "Doctor opened request",
      },
    });
  }

  const updated = await getRequestById(id);
  if (!updated) return { ok: false, error: "Request not found" };
  return { ok: true, request: updated };
}

export async function getRequestsForDoctor(doctorId: string): Promise<ConsultRequest[]> {
  const rows = await prisma.consultRequest.findMany({
    where: {
      OR: [
        // Medical certificates: open shared queue + ones claimed by this doctor
        {
          type: "medical_certificate",
          OR: [{ assignedDoctorId: null }, { assignedDoctorId: doctorId }],
        },
        // Telehealth: only consultations the patient booked with this doctor
        {
          type: "telehealth",
          assignedDoctorId: doctorId,
        },
      ],
    },
    orderBy: { createdAt: "asc" }, // oldest first — reward fast responders
  });
  return rows.map(mapDbRequestToConsult);
}

export async function updateRequest(
  id: string,
  updates: Partial<ConsultRequest> & { certificate?: ConsultRequest["certificate"] },
  actor?: { id: string; role: string }
): Promise<ConsultRequest | null> {
  const existing = await prisma.consultRequest.findUnique({ where: { id } });
  if (!existing) return null;

  const data: Record<string, unknown> = {};

  if (updates.status !== undefined) data.status = updates.status;
  if (updates.doctorNotes !== undefined) data.doctorNotes = updates.doctorNotes;
  if (updates.approvedDays !== undefined) data.approvedDays = updates.approvedDays;
  if (updates.declineReason !== undefined) data.declineReason = updates.declineReason;
  if (updates.assignedDoctorId !== undefined)
    data.assignedDoctorId = updates.assignedDoctorId;
  if (updates.certificate !== undefined)
    data.certificateJson = JSON.stringify(updates.certificate);
  if (updates.telehealthSlot !== undefined)
    data.slotJson = JSON.stringify(updates.telehealthSlot);

  const row = await prisma.consultRequest.update({
    where: { id },
    data,
  });

  if (updates.status && updates.status !== existing.status) {
    await prisma.statusHistory.create({
      data: {
        requestId: id,
        fromStatus: existing.status,
        toStatus: updates.status,
        actorId: actor?.id,
        actorRole: actor?.role,
        note: updates.doctorNotes || updates.declineReason || undefined,
      },
    });
  }

  return mapDbRequestToConsult(row);
}
