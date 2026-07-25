export type CertificateType = "work" | "school" | "carer";

export type RequestStatus =
  | "pending"
  | "under_review"
  | "needs_followup"
  | "scheduled"
  | "approved"
  | "declined"
  | "completed";

export type RequestType = "medical_certificate" | "telehealth";

export interface PatientDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
}

export interface MedicalCertificateData {
  certificateType: CertificateType;
  symptoms: string;
  situation: string;
  startDate: string;
  daysNeeded: number;
  employerOrSchool?: string;
}

export interface TelehealthData {
  reason: string;
  symptoms: string;
  duration: string;
  medications?: string;
  preferredTime: string;
  additionalNotes?: string;
  preferredDoctorId: string;
  preferredDoctorName: string;
}

export interface PaymentInfo {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: "paid" | "refunded" | "waived";
  paidAt: string;
}

export interface MedicalCertificateDocument {
  certificateNumber: string;
  patientName: string;
  certificateType: CertificateType;
  startDate: string;
  endDate: string;
  approvedDays: number;
  issuedAt: string;
  doctorName: string;
  nmcNumber?: string;
}

export interface TelehealthSlot {
  scheduledAt: string;
  doctorName: string;
  doctorPhone?: string;
  notes?: string;
}

export interface ConsultRequest {
  id: string;
  type: RequestType;
  status: RequestStatus;
  patient: PatientDetails;
  medicalCertificate?: MedicalCertificateData;
  telehealth?: TelehealthData;
  payment?: PaymentInfo;
  certificate?: MedicalCertificateDocument;
  telehealthSlot?: TelehealthSlot;
  preferredDoctorId?: string;
  preferredDoctorName?: string;
  assignedDoctorId?: string;
  accessToken: string;
  doctorNotes?: string;
  approvedDays?: number;
  declineReason?: string;
  createdAt: string;
  updatedAt: string;
}
