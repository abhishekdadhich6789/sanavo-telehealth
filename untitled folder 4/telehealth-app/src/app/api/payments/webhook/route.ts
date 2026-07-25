import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";

/**
 * Razorpay webhook — marks orders paid server-side when payment.captured fires.
 * Configure webhook URL: POST /api/payments/webhook
 * Secret: RAZORPAY_WEBHOOK_SECRET
 */
export async function POST(request: NextRequest) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (webhookSecret) {
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }
    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");
    try {
      const valid = crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(signature.padEnd(expected.length).slice(0, expected.length))
      );
      if (!valid) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "RAZORPAY_WEBHOOK_SECRET is required in production" },
      { status: 503 }
    );
  }

  let event: {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          status?: string;
          amount?: number;
        };
      };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.event === "payment.captured" || event.event === "payment.authorized") {
    const payment = event.payload?.payment?.entity;
    if (payment?.order_id && payment?.id) {
      const order = await prisma.paymentOrder.findUnique({
        where: { orderId: payment.order_id },
      });

      if (order && order.status === "created") {
        // Only mark paid if not already linked to a request by client verify
        await prisma.paymentOrder.update({
          where: { orderId: payment.order_id },
          data: {
            paymentId: payment.id,
            status: order.requestId ? "paid" : "captured",
          },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
