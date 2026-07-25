import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createRequest, getRequestById } from "@/lib/store";
import { PaymentInfo } from "@/lib/types";
import {
  getAmountForService,
  isDemoPaymentMode,
  isRazorpayConfigured,
} from "@/lib/payments/razorpay";
import { DEMO_PAYMENT_SIGNATURE } from "@/lib/constants";
import { createRequestSchema } from "@/lib/validators";
import { notifyRequestSubmitted } from "@/lib/services/notifications";
import {
  getPaymentOrderByOrderId,
  getPaymentOrderByPaymentId,
  markPaymentOrderPaid,
} from "@/lib/payments/orders";
import { clientKey, rateLimit } from "@/lib/rate-limit";

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET!;
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return safeEqualHex(expected, signature);
}

function isValidDemoPayment(orderId: string, signature: string): boolean {
  return (
    isDemoPaymentMode() &&
    orderId.startsWith("demo_order_") &&
    signature === DEMO_PAYMENT_SIGNATURE
  );
}

export async function POST(request: NextRequest) {
  const limited = rateLimit({
    key: clientKey(request, "pay-verify"),
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      ...requestFields
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }

    const parsed = createRequestSchema.safeParse(requestFields);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Idempotency: if this payment already created a request, return it
    const byPayment = await getPaymentOrderByPaymentId(razorpay_payment_id);
    if (byPayment?.requestId) {
      const existing = await getRequestById(byPayment.requestId);
      if (existing) {
        return NextResponse.json(existing, { status: 200 });
      }
    }

    const paymentOrder = await getPaymentOrderByOrderId(razorpay_order_id);
    if (!paymentOrder) {
      return NextResponse.json(
        { error: "Unknown payment order. Create an order first." },
        { status: 400 }
      );
    }

    if (paymentOrder.requestId) {
      const existing = await getRequestById(paymentOrder.requestId);
      if (existing) {
        return NextResponse.json(existing, { status: 200 });
      }
    }

    const data = parsed.data;
    const expectedAmount = getAmountForService(data.type);

    if (paymentOrder.serviceType !== data.type) {
      return NextResponse.json(
        { error: "Payment order service type mismatch" },
        { status: 400 }
      );
    }

    if (paymentOrder.amount !== expectedAmount) {
      return NextResponse.json(
        { error: "Payment amount mismatch" },
        { status: 400 }
      );
    }

    const isDemo = isValidDemoPayment(razorpay_order_id, razorpay_signature);

    if (!isDemo) {
      if (!isRazorpayConfigured()) {
        return NextResponse.json(
          { error: "Payment gateway is not configured" },
          { status: 503 }
        );
      }

      let isValid = false;
      try {
        isValid = verifyPaymentSignature(
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature
        );
      } catch {
        isValid = false;
      }

      if (!isValid) {
        return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
      }
    }

    const payment: PaymentInfo = {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      amount: expectedAmount,
      currency: "INR",
      status: "paid",
      paidAt: new Date().toISOString(),
    };

    const newRequest = await createRequest({
      type: data.type,
      patient: data.patient,
      medicalCertificate:
        data.type === "medical_certificate" ? data.medicalCertificate : undefined,
      telehealth: data.type === "telehealth" ? data.telehealth : undefined,
      payment,
    });

    try {
      await markPaymentOrderPaid({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        requestId: newRequest.id,
      });
    } catch {
      // Race: another verify won — return the existing request if possible
      const again = await getPaymentOrderByOrderId(razorpay_order_id);
      if (again?.requestId) {
        const existing = await getRequestById(again.requestId);
        if (existing) return NextResponse.json(existing, { status: 200 });
      }
      throw new Error("Failed to finalize payment order");
    }

    await notifyRequestSubmitted(
      newRequest.id,
      newRequest.patient.phone,
      newRequest.patient.email,
      newRequest.accessToken
    );

    return NextResponse.json(newRequest, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}
