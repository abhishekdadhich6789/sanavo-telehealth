import { z } from "zod";

/** Indian mobile: exactly 10 digits, starting with 6–9 */
export const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

export function isValidIndianPhone(phone: string): boolean {
  return INDIAN_PHONE_REGEX.test(phone.replace(/\s/g, ""));
}

export function sanitizePhoneInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

export const indianPhoneSchema = z
  .string()
  .trim()
  .regex(INDIAN_PHONE_REGEX, {
    message: "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9",
  });

/**
 * NMC / State Medical Council registration number:
 * - Letters, digits, slash, hyphen only
 * - 5–20 characters
 * - Must include at least one digit (not placeholder text)
 * - Rejects common fake values
 */
export const NMC_NUMBER_REGEX = /^[A-Za-z0-9][A-Za-z0-9/-]{3,18}[A-Za-z0-9]$/;

const FAKE_NMC_VALUES = new Set([
  "00000",
  "12345",
  "123456",
  "11111",
  "nmc123",
  "test",
  "testing",
  "abcdef",
  "xxxxx",
]);

export function sanitizeNmcInput(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9/-]/g, "")
    .slice(0, 20);
}

export function isValidNmcNumber(nmc: string): boolean {
  const cleaned = nmc.trim().toUpperCase();
  if (!NMC_NUMBER_REGEX.test(cleaned)) return false;
  if (!/\d/.test(cleaned)) return false;
  if (FAKE_NMC_VALUES.has(cleaned.toLowerCase())) return false;
  if (/^0+$/.test(cleaned.replace(/[^0-9]/g, ""))) return false;
  return true;
}

export const nmcNumberSchema = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine(isValidNmcNumber, {
    message:
      "Enter a valid NMC / State Medical Council number (5–20 chars, letters/digits, must include digits)",
  });

export const createDoctorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80)
    .regex(/^[A-Za-z.\s'-]+$/, "Name can only contain letters and basic punctuation"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(128)
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[0-9]/, "Password must include a number")
    .regex(/[^A-Za-z0-9]/, "Password must include a special character"),
  nmcNumber: nmcNumberSchema,
  phone: z
    .string()
    .optional()
    .transform((v) => (v ? v.replace(/\D/g, "") : ""))
    .refine((v) => !v || isValidIndianPhone(v), {
      message: "Enter a valid 10-digit Indian mobile number starting with 6–9",
    }),
});

export const patientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: indianPhoneSchema,
  dateOfBirth: z.string().min(1),
});

export const medicalCertificateSchema = z.object({
  certificateType: z.enum(["work", "school", "carer"]),
  symptoms: z.string().min(1),
  situation: z.string().min(1),
  startDate: z.string().min(1),
  daysNeeded: z.number().int().min(1).max(2),
  employerOrSchool: z.string().optional(),
});

export const telehealthSchema = z.object({
  reason: z.string().min(1),
  symptoms: z.string().min(1),
  duration: z.string().min(1),
  medications: z.string().optional(),
  preferredTime: z.string().min(1),
  additionalNotes: z.string().optional(),
  preferredDoctorId: z.string().min(1, "Please select a partner doctor"),
  preferredDoctorName: z.string().min(1),
});

export const createRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("medical_certificate"),
    patient: patientSchema,
    medicalCertificate: medicalCertificateSchema,
  }),
  z.object({
    type: z.literal("telehealth"),
    patient: patientSchema,
    telehealth: telehealthSchema,
  }),
]);

export const updateRequestSchema = z.object({
  status: z
    .enum([
      "pending",
      "under_review",
      "needs_followup",
      "scheduled",
      "approved",
      "declined",
      "completed",
    ])
    .optional(),
  doctorNotes: z.string().optional(),
  approvedDays: z.number().int().min(1).max(2).optional(),
  declineReason: z.string().optional(),
  assignedDoctorId: z.string().optional(),
  telehealthSlot: z
    .object({
      scheduledAt: z.string().min(1),
      doctorName: z.string().min(1),
      doctorPhone: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});
