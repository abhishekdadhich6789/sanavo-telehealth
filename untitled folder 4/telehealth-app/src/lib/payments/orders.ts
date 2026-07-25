import { prisma } from "@/lib/db";
import { RequestType } from "@/lib/types";

export async function createPaymentOrderRecord(input: {
  orderId: string;
  serviceType: RequestType;
  amount: number;
  patientEmail?: string;
  patientPhone?: string;
  patientName?: string;
}) {
  return prisma.paymentOrder.create({
    data: {
      orderId: input.orderId,
      serviceType: input.serviceType,
      amount: input.amount,
      currency: "INR",
      status: "created",
      patientEmail: input.patientEmail || null,
      patientPhone: input.patientPhone || null,
      patientName: input.patientName || null,
    },
  });
}

export async function getPaymentOrderByOrderId(orderId: string) {
  return prisma.paymentOrder.findUnique({ where: { orderId } });
}

export async function getPaymentOrderByPaymentId(paymentId: string) {
  return prisma.paymentOrder.findUnique({ where: { paymentId } });
}

export async function markPaymentOrderPaid(input: {
  orderId: string;
  paymentId: string;
  requestId: string;
}) {
  return prisma.paymentOrder.update({
    where: { orderId: input.orderId },
    data: {
      paymentId: input.paymentId,
      status: "paid",
      requestId: input.requestId,
    },
  });
}
