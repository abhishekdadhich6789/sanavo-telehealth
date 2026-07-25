import Razorpay from "razorpay";
import { PRICES } from "@/lib/constants";
import { RequestType } from "@/lib/types";

export { DEMO_PAYMENT_SIGNATURE } from "@/lib/constants";

export function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured");
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export function getRazorpayKeyId() {
  return process.env.RAZORPAY_KEY_ID || "";
}

export function isRazorpayConfigured() {
  return !!(
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET &&
    !process.env.RAZORPAY_KEY_ID.includes("your_key")
  );
}

/** Allows simulated payments only in development when Razorpay keys are not set */
export function isDemoPaymentMode() {
  // Never allow demo payments in production
  if (process.env.NODE_ENV === "production") return false;
  if (isRazorpayConfigured()) return false;
  if (process.env.PAYMENT_DEMO_MODE === "false") return false;
  return true;
}

export function getAmountForService(type: RequestType): number {
  return type === "medical_certificate"
    ? PRICES.medicalCertificate
    : PRICES.telehealth;
}

export function getServiceLabel(type: RequestType): string {
  return type === "medical_certificate"
    ? "Medical Certificate Consultation"
    : "Telehealth Consultation";
}
