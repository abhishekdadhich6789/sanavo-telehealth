import { ConsultRequest, MedicalCertificateDocument } from "@/lib/types";

export async function generateCertificate(
  request: ConsultRequest,
  doctor: { name: string; nmcNumber?: string | null },
  approvedDays: number
): Promise<MedicalCertificateDocument> {
  const start = new Date(request.medicalCertificate!.startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + approvedDays - 1);

  const certificate: MedicalCertificateDocument = {
    certificateNumber: `SA-${request.id.slice(0, 8).toUpperCase()}`,
    patientName: `${request.patient.firstName} ${request.patient.lastName}`,
    certificateType: request.medicalCertificate!.certificateType,
    startDate: request.medicalCertificate!.startDate,
    endDate: end.toISOString().split("T")[0],
    approvedDays,
    issuedAt: new Date().toISOString(),
    doctorName: doctor.name,
    nmcNumber: doctor.nmcNumber ?? undefined,
  };

  return certificate;
}

export function formatCertificateText(cert: MedicalCertificateDocument): string {
  const typeLabel =
    cert.certificateType === "work"
      ? "Work / Sick Leave"
      : cert.certificateType === "school"
        ? "School / University"
        : "Carer's Leave";

  return `MEDICAL CERTIFICATE

Certificate No: ${cert.certificateNumber}
Date Issued: ${new Date(cert.issuedAt).toLocaleDateString("en-IN")}

This is to certify that ${cert.patientName} was examined and is unfit for ${typeLabel.toLowerCase()} from ${cert.startDate} to ${cert.endDate} (${cert.approvedDays} day(s)).

Issued by: Dr. ${cert.doctorName}
NMC Reg: ${cert.nmcNumber || "N/A"}

Sanavo Telehealth Platform`;
}
