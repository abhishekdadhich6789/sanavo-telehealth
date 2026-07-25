import {
  ConsultRequest,
  MedicalCertificateData,
  PatientDetails,
  PaymentInfo,
  TelehealthData,
  TelehealthSlot,
} from "./types";

type DbRequest = {
  id: string;
  type: string;
  status: string;
  patientJson: string;
  medicalCertificate: string | null;
  telehealth: string | null;
  paymentJson: string | null;
  doctorNotes: string | null;
  approvedDays: number | null;
  declineReason: string | null;
  certificateJson: string | null;
  slotJson: string | null;
  assignedDoctorId: string | null;
  accessToken: string;
  createdAt: Date;
  updatedAt: Date;
};

export function mapDbRequestToConsult(db: DbRequest): ConsultRequest {
  return {
    id: db.id,
    type: db.type as ConsultRequest["type"],
    status: db.status as ConsultRequest["status"],
    patient: JSON.parse(db.patientJson) as PatientDetails,
    medicalCertificate: db.medicalCertificate
      ? (JSON.parse(db.medicalCertificate) as MedicalCertificateData)
      : undefined,
    telehealth: db.telehealth
      ? (JSON.parse(db.telehealth) as TelehealthData)
      : undefined,
    payment: db.paymentJson
      ? (JSON.parse(db.paymentJson) as PaymentInfo)
      : undefined,
    doctorNotes: db.doctorNotes ?? undefined,
    approvedDays: db.approvedDays ?? undefined,
    declineReason: db.declineReason ?? undefined,
    certificate: db.certificateJson
      ? (JSON.parse(db.certificateJson) as ConsultRequest["certificate"])
      : undefined,
    telehealthSlot: db.slotJson
      ? (JSON.parse(db.slotJson) as TelehealthSlot)
      : undefined,
    assignedDoctorId: db.assignedDoctorId ?? undefined,
    accessToken: db.accessToken,
    createdAt: db.createdAt.toISOString(),
    updatedAt: db.updatedAt.toISOString(),
  };
}
