import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PatientDetails } from "@/lib/types";
import { DEMO_PAYMENT_SIGNATURE } from "@/lib/constants";
import { openRazorpayCheckout } from "@/lib/payments/checkout";

interface PaymentCheckoutParams {
  router: AppRouterInstance;
  serviceType: "medical_certificate" | "telehealth";
  amount: number;
  serviceLabel: string;
  patient: PatientDetails;
  requestPayload: Record<string, unknown>;
  onError: (message: string) => void;
  onFinally: () => void;
}

async function verifyAndRedirect(
  router: AppRouterInstance,
  payload: Record<string, unknown>,
  onError: (message: string) => void,
  onFinally: () => void
) {
  const verifyRes = await fetch("/api/payments/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const verifyData = await verifyRes.json();

  if (!verifyRes.ok) {
    onError(verifyData.error || "Payment verification failed");
    onFinally();
    return;
  }

  router.push(`/status/${verifyData.id}?token=${verifyData.accessToken}`);
}

export async function processPaymentCheckout({
  router,
  serviceType,
  serviceLabel,
  patient,
  requestPayload,
  onError,
  onFinally,
}: PaymentCheckoutParams) {
  try {
    const orderRes = await fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceType,
        patientName: `${patient.firstName} ${patient.lastName}`,
        patientEmail: patient.email,
        patientPhone: patient.phone,
      }),
    });

    const orderData = await orderRes.json();

    if (!orderRes.ok) {
      onError(orderData.error || "Failed to initiate payment");
      onFinally();
      return;
    }

    // Demo mode: confirm payment locally when Razorpay keys are not configured
    if (orderData.demo) {
      const confirmed = window.confirm(
        `Demo payment\n\nPay ${orderData.currency === "INR" ? "₹" : ""}${orderData.amount} for ${orderData.serviceLabel}?\n\n(No real charge — add Razorpay keys for live payments)`
      );

      if (!confirmed) {
        onError("Payment was cancelled");
        onFinally();
        return;
      }

      await verifyAndRedirect(
        router,
        {
          ...requestPayload,
          razorpay_order_id: orderData.orderId,
          razorpay_payment_id: `demo_pay_${Date.now()}`,
          razorpay_signature: DEMO_PAYMENT_SIGNATURE,
        },
        onError,
        onFinally
      );
      return;
    }

    await openRazorpayCheckout({
      key: orderData.keyId,
      amount: orderData.amount * 100,
      currency: orderData.currency,
      name: "Sanavo",
      description: serviceLabel,
      order_id: orderData.orderId,
      prefill: {
        name: `${patient.firstName} ${patient.lastName}`,
        email: patient.email,
        contact: patient.phone,
      },
      theme: { color: "#0d9488" },
      onSuccess: async (response) => {
        try {
          await verifyAndRedirect(
            router,
            {
              ...requestPayload,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            },
            onError,
            onFinally
          );
        } catch {
          onError("Payment succeeded but request submission failed. Contact support.");
          onFinally();
        }
      },
      onDismiss: () => {
        onError("Payment was cancelled");
        onFinally();
      },
    });
  } catch {
    onError("Something went wrong. Please try again.");
    onFinally();
  }
}
