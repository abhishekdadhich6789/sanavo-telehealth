import { NextRequest, NextResponse } from "next/server";
import {
  getAmountForService,
  getRazorpayInstance,
  getRazorpayKeyId,
  getServiceLabel,
  isDemoPaymentMode,
  isRazorpayConfigured,
} from "@/lib/payments/razorpay";
import { createPaymentOrderRecord } from "@/lib/payments/orders";
import { RequestType } from "@/lib/types";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { isValidIndianPhone } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const limited = rateLimit({
    key: clientKey(request, "pay-order"),
    limit: 15,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  try {
    const { serviceType, patientName, patientEmail, patientPhone } =
      await request.json();

    if (!serviceType || !["medical_certificate", "telehealth"].includes(serviceType)) {
      return NextResponse.json({ error: "Invalid service type" }, { status: 400 });
    }

    const type = serviceType as RequestType;
    const amount = getAmountForService(type);
    const phone =
      typeof patientPhone === "string" ? patientPhone.replace(/\D/g, "") : "";
    if (phone && !isValidIndianPhone(phone)) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit Indian mobile number" },
        { status: 400 }
      );
    }

    if (isDemoPaymentMode()) {
      const orderId = `demo_order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await createPaymentOrderRecord({
        orderId,
        serviceType: type,
        amount,
        patientEmail,
        patientPhone: phone || undefined,
        patientName,
      });

      return NextResponse.json({
        demo: true,
        orderId,
        amount,
        currency: "INR",
        serviceLabel: getServiceLabel(type),
      });
    }

    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        {
          error:
            "Payment gateway is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.local, or set PAYMENT_DEMO_MODE=true for local testing.",
        },
        { status: 503 }
      );
    }

    const razorpay = getRazorpayInstance();

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `mc_${Date.now()}`,
      notes: {
        serviceType: type,
        patientName: patientName || "",
        patientEmail: patientEmail || "",
        patientPhone: phone || "",
      },
    });

    await createPaymentOrderRecord({
      orderId: order.id,
      serviceType: type,
      amount,
      patientEmail,
      patientPhone: phone || undefined,
      patientName,
    });

    return NextResponse.json({
      demo: false,
      orderId: order.id,
      amount,
      currency: "INR",
      keyId: getRazorpayKeyId(),
      serviceLabel: getServiceLabel(type),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create payment order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
