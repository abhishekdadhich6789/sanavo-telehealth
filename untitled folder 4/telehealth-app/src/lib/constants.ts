export const BRAND_NAME = "Sanavo";
export const BRAND_EMAIL_DOMAIN = "sanavo.in";

export const PRICES = {
  medicalCertificate: 250,
  telehealth: 500,
} as const;

export const formatINR = (amount: number) => `₹${amount}`;

export const DOCTOR_REGISTRATION_LABEL = "NMC-registered";
export const DOCTOR_REGISTRATION_FULL =
  "National Medical Commission (NMC) registered";

/** Shared demo payment signature (client + server safe) */
export const DEMO_PAYMENT_SIGNATURE = "demo_payment_signature";
