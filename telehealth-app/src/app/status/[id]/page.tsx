"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ConsultRequest } from "@/lib/types";
import { formatINR } from "@/lib/constants";

const STATUS_INFO: Record<
  string,
  { title: string; description: string; icon: string; color: string }
> = {
  pending: {
    title: "Request Submitted",
    description:
      "Your request has been received and is in the queue. An NMC-registered doctor will review it shortly.",
    icon: "⏳",
    color: "text-yellow-600",
  },
  under_review: {
    title: "Under Review",
    description:
      "A partner doctor is currently reviewing your request. You may receive a call if they need follow-up information.",
    icon: "🔍",
    color: "text-blue-600",
  },
  needs_followup: {
    title: "Follow-up Required",
    description:
      "The doctor needs to speak with you. Please keep your phone nearby — they will call you shortly.",
    icon: "📞",
    color: "text-orange-600",
  },
  scheduled: {
    title: "Consultation Slot Confirmed",
    description:
      "Your telehealth slot has been confirmed. Details have been sent to your phone via SMS and email.",
    icon: "📅",
    color: "text-teal-600",
  },
  approved: {
    title: "Certificate Approved!",
    description:
      "Your medical certificate has been approved and sent to your phone via SMS and email. Please check your inbox.",
    icon: "✅",
    color: "text-green-600",
  },
  declined: {
    title: "Request Declined",
    description:
      "After clinical review, the doctor determined a medical certificate is not suitable for your request at this time.",
    icon: "❌",
    color: "text-red-600",
  },
  completed: {
    title: "Consultation Complete",
    description:
      "Your telehealth consultation has been completed. Thank you for using Sanavo.",
    icon: "✅",
    color: "text-green-600",
  },
};

function StatusContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const token = searchParams.get("token");
  const [request, setRequest] = useState<
    (ConsultRequest & {
      messages?: { id: string; channel: string; subject: string | null; status: string; createdAt: string }[];
    }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Missing access link. Please use the link from your confirmation page.");
      setLoading(false);
      return;
    }

    const fetchStatus = async () => {
      const res = await fetch(`/api/requests/${id}?token=${token}`);
      if (res.ok) {
        setRequest(await res.json());
      } else {
        setError("Request not found or invalid access link.");
      }
      setLoading(false);
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [id, token]);

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <p className="text-slate-500">Loading your request status...</p>
      </main>
    );
  }

  if (error || !request) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          {error || "Request not found"}
        </h1>
        <Link href="/" className="mt-4 inline-block text-teal-600 hover:underline">
          Return home
        </Link>
      </main>
    );
  }

  const info = STATUS_INFO[request.status] ?? STATUS_INFO.pending;

  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="text-5xl">{info.icon}</div>
        <h1 className={`mt-4 text-2xl font-bold ${info.color}`}>{info.title}</h1>
        <p className="mt-3 text-slate-500">{info.description}</p>

        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-left text-sm">
          <div className="grid gap-2">
            <div>
              <span className="text-slate-500">Reference:</span>{" "}
              <span className="font-mono text-xs">{request.id.slice(0, 8)}</span>
            </div>
            <div>
              <span className="text-slate-500">Type:</span>{" "}
              {request.type === "medical_certificate"
                ? "Medical Certificate"
                : "Telehealth Consultation"}
            </div>
            <div>
              <span className="text-slate-500">Submitted:</span>{" "}
              {new Date(request.createdAt).toLocaleString("en-IN")}
            </div>
            {request.payment && (
              <div>
                <span className="text-slate-500">Fee:</span>{" "}
                {formatINR(request.payment.amount)}
                {request.payment.status === "paid"
                  ? " · Paid"
                  : request.payment.status === "waived"
                    ? " (beta — no charge)"
                    : ""}
              </div>
            )}
            {request.approvedDays && (
              <div>
                <span className="text-slate-500">Approved days:</span>{" "}
                {request.approvedDays}
              </div>
            )}
            {request.declineReason && (
              <div>
                <span className="text-slate-500">Reason:</span> {request.declineReason}
              </div>
            )}
          </div>
        </div>

        {request.certificate && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-left text-sm text-green-900">
            <div className="font-semibold">Your Medical Certificate</div>
            <div className="mt-2 space-y-1 text-green-800">
              <div>Certificate No: {request.certificate.certificateNumber}</div>
              <div>
                Valid: {request.certificate.startDate} to {request.certificate.endDate}
              </div>
              <div>Issued by: Dr. {request.certificate.doctorName}</div>
            </div>
            <p className="mt-3 text-xs text-green-700">
              PDF certificate sent to your email. You can also download it below.
            </p>
            {token && (
              <a
                href={`/api/requests/${id}/certificate?token=${encodeURIComponent(token)}`}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
              >
                Download PDF certificate
              </a>
            )}
          </div>
        )}

        {request.telehealthSlot && (
          <div className="mt-6 rounded-xl border border-teal-200 bg-teal-50 p-4 text-left text-sm text-teal-900">
            <div className="font-semibold">Your Consultation Slot</div>
            <div className="mt-2 space-y-1 text-teal-800">
              <div>
                When:{" "}
                {new Date(request.telehealthSlot.scheduledAt).toLocaleString("en-IN", {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </div>
              <div>Doctor: Dr. {request.telehealthSlot.doctorName}</div>
              {request.telehealthSlot.notes && (
                <div>Notes: {request.telehealthSlot.notes}</div>
              )}
            </div>
            <p className="mt-3 text-xs text-teal-700">
              Slot details sent to your SMS & email. Keep your phone ready.
            </p>
          </div>
        )}

        {request.messages && request.messages.length > 0 && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm">
            <div className="font-semibold text-slate-800">Messages sent to you</div>
            <ul className="mt-2 space-y-2">
              {request.messages.map((m) => (
                <li key={m.id} className="flex items-center justify-between text-slate-600">
                  <span>
                    {m.channel === "sms" ? "📱 SMS" : "📧 Email"}
                    {m.subject ? ` — ${m.subject.replace(/\s*\[.*?\]\s*$/, "")}` : ""}
                  </span>
                  <span
                    className={`text-xs ${
                      m.status === "sent" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {m.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {request.status === "pending" && (
          <div className="mt-6 space-y-3">
            <div className="text-sm text-slate-500">
              <div className="mb-2 font-medium text-slate-700">What happens next?</div>
              <ol className="space-y-2 text-left">
                <li className="flex gap-2">
                  <span className="font-bold text-teal-600">1.</span>
                  A doctor reviews your questionnaire
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-teal-600">2.</span>
                  They may call you with follow-up questions
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-teal-600">3.</span>
                  You&apos;ll receive an outcome via SMS and email
                </li>
              </ol>
            </div>
            <p className="text-xs text-slate-400">
              This page refreshes automatically. Typical review time is within 1 hour.
            </p>
          </div>
        )}

        {request.status === "approved" && request.patient && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            📱 SMS sent to {request.patient.phone}
            <br />
            📧 Email sent to {request.patient.email}
          </div>
        )}

        <Link
          href="/"
          className="mt-8 inline-block text-sm font-medium text-teal-600 hover:underline"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  );
}

export default function StatusPage() {
  return (
    <>
      <Header />
      <Suspense fallback={<main className="flex min-h-[50vh] items-center justify-center"><p className="text-slate-500">Loading...</p></main>}>
        <StatusContent />
      </Suspense>
      <Footer />
    </>
  );
}
