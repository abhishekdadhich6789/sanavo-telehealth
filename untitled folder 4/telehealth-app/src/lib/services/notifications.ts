import { prisma } from "@/lib/db";
import { sendEmail, EmailAttachment } from "@/lib/services/delivery/email";
import { sendSms } from "@/lib/services/delivery/sms";
import { MedicalCertificateDocument, TelehealthSlot } from "@/lib/types";
import { formatCertificateText } from "@/lib/services/certificates";
import {
  certificatePdfFilename,
  generateCertificatePdf,
} from "@/lib/services/certificate-pdf";
import { getStatusUrl } from "@/lib/config";

interface SendNotificationInput {
  requestId: string;
  channel: "sms" | "email";
  recipient: string;
  subject?: string;
  body: string;
  attachments?: EmailAttachment[];
}

export async function queueNotification(input: SendNotificationInput) {
  let deliveryStatus = "queued";
  let provider = "none";
  let error: string | undefined;

  if (input.channel === "email") {
    const result = await sendEmail({
      to: input.recipient,
      subject: input.subject || "Sanavo",
      text: input.body,
      attachments: input.attachments,
    });
    deliveryStatus = result.ok ? "sent" : "failed";
    provider = result.provider;
    error = result.error;
  } else {
    const result = await sendSms({
      to: input.recipient,
      body: input.body,
    });
    deliveryStatus = result.ok ? "sent" : "failed";
    provider = result.provider;
    error = result.error;
  }

  const attachmentNote =
    input.attachments && input.attachments.length > 0
      ? `\n\n[Attached: ${input.attachments.map((a) => a.filename).join(", ")}]`
      : "";

  const notification = await prisma.notification.create({
    data: {
      requestId: input.requestId,
      channel: input.channel,
      recipient: input.recipient,
      subject: input.subject
        ? `${input.subject} [${provider}]`
        : `[${provider}]`,
      body: error
        ? `${input.body}${attachmentNote}\n\nDelivery error: ${error}`
        : `${input.body}${attachmentNote}`,
      status: deliveryStatus,
    },
  });

  return notification;
}

export async function notifyRequestSubmitted(
  requestId: string,
  phone: string,
  email: string,
  accessToken: string
) {
  const statusUrl = getStatusUrl(requestId, accessToken);

  await queueNotification({
    requestId,
    channel: "sms",
    recipient: phone,
    body: `Sanavo: Request received (Ref ${requestId.slice(0, 8)}). Track: ${statusUrl}`,
  });

  await queueNotification({
    requestId,
    channel: "email",
    recipient: email,
    subject: "Sanavo — Request Received",
    body: `Hi,\n\nYour Sanavo request has been submitted successfully.\n\nReference: ${requestId}\n\nTrack your status here (keep this link private):\n${statusUrl}\n\nAn NMC-registered doctor will review it shortly. You will receive another SMS and email when your certificate or consultation slot is confirmed.\n\n— Sanavo`,
  });
}

export async function notifyCertificateApproved(
  requestId: string,
  phone: string,
  email: string,
  certificate: MedicalCertificateDocument,
  accessToken: string
) {
  const statusUrl = getStatusUrl(requestId, accessToken);
  const certText = formatCertificateText(certificate);
  const pdfBytes = await generateCertificatePdf(certificate);
  const filename = certificatePdfFilename(certificate);

  await queueNotification({
    requestId,
    channel: "sms",
    recipient: phone,
    body: `Sanavo: Certificate APPROVED (${certificate.certificateNumber}). Valid ${certificate.startDate} to ${certificate.endDate}. PDF sent to your email. View/download: ${statusUrl}`,
  });

  await queueNotification({
    requestId,
    channel: "email",
    recipient: email,
    subject: `Sanavo — Medical Certificate ${certificate.certificateNumber}`,
    body: `Hi ${certificate.patientName},\n\nYour medical certificate has been approved by Dr. ${certificate.doctorName}.\n\nThe PDF certificate is attached to this email.\n\n${certText}\n\nYou can also view or download it here (keep this link private):\n${statusUrl}\n\nPlease keep this email for your records.\n\n— Sanavo`,
    attachments: [
      {
        filename,
        content: pdfBytes,
        contentType: "application/pdf",
      },
    ],
  });
}

export async function notifyTelehealthSlotConfirmed(
  requestId: string,
  phone: string,
  email: string,
  patientName: string,
  slot: TelehealthSlot,
  accessToken?: string
) {
  const when = new Date(slot.scheduledAt).toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
  const statusLine = accessToken
    ? `\n\nTrack status: ${getStatusUrl(requestId, accessToken)}`
    : "";

  await queueNotification({
    requestId,
    channel: "sms",
    recipient: phone,
    body: `Sanavo: Telehealth slot confirmed. Dr. ${slot.doctorName} will call you on ${when} IST. Keep your phone ready.`,
  });

  await queueNotification({
    requestId,
    channel: "email",
    recipient: email,
    subject: "Sanavo — Telehealth Slot Confirmed",
    body: `Hi ${patientName},\n\nYour telehealth consultation slot has been confirmed.\n\nDoctor: Dr. ${slot.doctorName}\nDate & time: ${when} (IST)\n${slot.doctorPhone ? `Doctor contact: ${slot.doctorPhone}\n` : ""}Call mode: Phone call to your registered mobile\n${slot.notes ? `\nNotes: ${slot.notes}\n` : ""}\nPlease keep your phone nearby. If you miss the call, you may rejoin the waiting queue.\n\nReference: ${requestId}${statusLine}\n\n— Sanavo`,
  });
}

export async function notifyConsultationComplete(
  requestId: string,
  phone: string,
  email: string,
  patientName: string
) {
  await queueNotification({
    requestId,
    channel: "sms",
    recipient: phone,
    body: `Sanavo: Your telehealth consultation is complete. Thank you.`,
  });

  await queueNotification({
    requestId,
    channel: "email",
    recipient: email,
    subject: "Sanavo — Consultation Complete",
    body: `Hi ${patientName},\n\nYour telehealth consultation has been completed. If you need further care, please submit a new request on Sanavo.\n\nReference: ${requestId}\n\n— Sanavo`,
  });
}

export async function notifyRequestDeclined(
  requestId: string,
  phone: string,
  email: string,
  reason: string
) {
  await queueNotification({
    requestId,
    channel: "sms",
    recipient: phone,
    body: `Sanavo: Your request was declined. Check your email for details.`,
  });

  await queueNotification({
    requestId,
    channel: "email",
    recipient: email,
    subject: "Sanavo — Request Update",
    body: `Your request was not approved.\n\nReason: ${reason}\n\nReference: ${requestId}\n\n— Sanavo`,
  });
}

export async function notifyNeedsFollowup(
  requestId: string,
  phone: string,
  email: string,
  patientName: string,
  note: string,
  accessToken?: string
) {
  const statusLine = accessToken
    ? `\n\nStatus page: ${getStatusUrl(requestId, accessToken)}`
    : "";

  await queueNotification({
    requestId,
    channel: "sms",
    recipient: phone,
    body: `Sanavo: Doctor needs more information about your request (Ref ${requestId.slice(0, 8)}). Check your email.`,
  });

  await queueNotification({
    requestId,
    channel: "email",
    recipient: email,
    subject: "Sanavo — Additional Information Needed",
    body: `Hi ${patientName},\n\nA doctor reviewing your request needs additional information:\n\n${note}\n\nReference: ${requestId}${statusLine}\n\n— Sanavo`,
  });
}
