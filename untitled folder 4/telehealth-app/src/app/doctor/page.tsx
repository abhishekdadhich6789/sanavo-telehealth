"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Button from "@/components/Button";
import { ConsultRequest } from "@/lib/types";
import { formatINR } from "@/lib/constants";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending Review", color: "bg-yellow-100 text-yellow-800" },
  under_review: { label: "Under Review", color: "bg-blue-100 text-blue-800" },
  needs_followup: { label: "Needs Follow-up", color: "bg-orange-100 text-orange-800" },
  scheduled: { label: "Slot Confirmed", color: "bg-teal-100 text-teal-800" },
  approved: { label: "Approved", color: "bg-green-100 text-green-800" },
  declined: { label: "Declined", color: "bg-red-100 text-red-800" },
  completed: { label: "Completed", color: "bg-green-100 text-green-800" },
};

export default function DoctorPortalPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<ConsultRequest[]>([]);
  const [selected, setSelected] = useState<ConsultRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [approvedDays, setApprovedDays] = useState(1);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [slotDateTime, setSlotDateTime] = useState("");
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  const fetchRequests = async () => {
    const res = await fetch("/api/requests");
    if (res.status === 401) {
      router.push("/login?redirect=/doctor");
      return;
    }
    const data = await res.json();
    setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });
    fetchRequests();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const updateStatus = async (id: string, updates: Partial<ConsultRequest> & { telehealthSlot?: ConsultRequest["telehealthSlot"] }) => {
    setActionLoading(true);
    setMessage("");
    const res = await fetch(`/api/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Update failed");
      setActionLoading(false);
      return;
    }
    setMessage(
      updates.status === "approved"
        ? "Certificate approved — SMS & email sent to patient."
        : updates.status === "scheduled"
          ? "Slot confirmed — SMS & email sent to patient."
          : updates.status === "declined"
            ? "Request declined — patient notified."
            : "Updated successfully."
    );
    await fetchRequests();
    setSelected(data);
    setActionLoading(false);
    setDoctorNotes("");
    setDeclineReason("");
    setSlotDateTime("");
  };

  const pendingRequests = requests.filter(
    (r) =>
      r.status === "pending" ||
      r.status === "under_review" ||
      r.status === "scheduled"
  );

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Partner Portal</h1>
            <p className="mt-2 text-slate-500">
              Medical certificates: shared speed queue · Telehealth: your booked patients
            </p>
            {user && (
              <p className="mt-1 text-sm text-slate-400">
                Dr. {user.name} ({user.email})
              </p>
            )}
          </div>
          <Button variant="secondary" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {loading ? (
          <p className="text-slate-500">Loading requests...</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Request List */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Your queue ({pendingRequests.length} active)
              </h2>
              <p className="mb-3 text-xs text-slate-500">
                Certificate requests are open to all partners — first to claim handles
                it. Telehealth shows only patients who selected you.
              </p>
              {requests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                  No requests in your queue yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => (
                    <button
                      key={req.id}
                      type="button"
                      onClick={async () => {
                        setMessage("");
                        setApprovedDays(
                          Math.min(req.medicalCertificate?.daysNeeded ?? 1, 2)
                        );

                        // Claim medical certificates from shared queue (speed-based)
                        if (
                          req.status === "pending" ||
                          (req.type === "medical_certificate" && !req.assignedDoctorId)
                        ) {
                          const claimRes = await fetch(`/api/requests/${req.id}/claim`, {
                            method: "POST",
                          });
                          const claimData = await claimRes.json();
                          if (!claimRes.ok) {
                            setMessage(claimData.error || "Could not claim request");
                            setSelected(null);
                            fetchRequests();
                            return;
                          }
                          setSelected(claimData);
                          setMessage(
                            req.type === "medical_certificate"
                              ? "You claimed this certificate — approve quickly!"
                              : "Request opened"
                          );
                          fetchRequests();
                          return;
                        }

                        setSelected(req);
                      }}
                      className={`w-full rounded-xl border p-4 text-left transition hover:shadow-sm ${
                        selected?.id === req.id
                          ? "border-teal-500 bg-teal-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {req.patient.firstName} {req.patient.lastName}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {req.type === "medical_certificate"
                              ? "Medical Certificate · Open queue"
                              : `Telehealth · Booked with you`}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            STATUS_LABELS[req.status]?.color ?? "bg-slate-100"
                          }`}
                        >
                          {STATUS_LABELS[req.status]?.label ?? req.status}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                        <span>{new Date(req.createdAt).toLocaleString("en-IN")}</span>
                        {req.type === "medical_certificate" &&
                          !req.assignedDoctorId &&
                          req.status === "pending" && (
                            <span className="font-medium text-amber-600">
                              Unclaimed — tap to claim
                            </span>
                          )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Detail Panel */}
            <div>
              {selected ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {selected.patient.firstName} {selected.patient.lastName}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {selected.type === "medical_certificate"
                      ? "Medical Certificate Request"
                      : "Telehealth Consultation"}
                  </p>

                  <div className="mt-4 space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500">Email:</span>
                        <div>{selected.patient.email}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Phone:</span>
                        <div>{selected.patient.phone}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">DOB:</span>
                        <div>{selected.patient.dateOfBirth}</div>
                      </div>
                      {selected.payment && (
                        <div>
                          <span className="text-slate-500">Payment:</span>
                          <div className="font-medium text-green-700">
                            {formatINR(selected.payment.amount)}
                          {selected.payment.status === "paid"
                            ? " · Paid"
                            : selected.payment.status === "waived"
                              ? " (beta)"
                              : ""}
                          </div>
                        </div>
                      )}
                    </div>

                    {selected.medicalCertificate && (
                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="font-medium text-slate-700">Certificate Details</div>
                        <div className="mt-2 space-y-1">
                          <div>
                            Type:{" "}
                            <span className="capitalize">
                              {selected.medicalCertificate.certificateType}
                            </span>
                          </div>
                          <div>Symptoms: {selected.medicalCertificate.symptoms}</div>
                          <div>Situation: {selected.medicalCertificate.situation}</div>
                          <div>
                            Requested: {selected.medicalCertificate.startDate} for{" "}
                            {selected.medicalCertificate.daysNeeded} days
                          </div>
                        </div>
                      </div>
                    )}

                    {selected.telehealth && (
                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="font-medium text-slate-700">Consultation Details</div>
                        <div className="mt-2 space-y-1">
                          <div>Reason: {selected.telehealth.reason}</div>
                          <div>Symptoms: {selected.telehealth.symptoms}</div>
                          <div>Duration: {selected.telehealth.duration}</div>
                          {selected.telehealth.medications && (
                            <div>Medications: {selected.telehealth.medications}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {(selected.status === "pending" || selected.status === "under_review") && (
                    <div className="mt-6 space-y-4 border-t border-slate-200 pt-6">
                      {selected.type === "medical_certificate" ? (
                        <>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                              Days to approve
                            </label>
                            <select
                              value={Math.min(approvedDays, 2)}
                              onChange={(e) => setApprovedDays(parseInt(e.target.value))}
                              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm"
                            >
                              {[1, 2].map((d) => (
                                <option key={d} value={d}>
                                  {d} {d === 1 ? "day" : "days"}
                                </option>
                              ))}
                            </select>
                            <p className="mt-1 text-xs text-slate-400">
                              Maximum 2 days per certificate
                            </p>
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                              Doctor notes (optional)
                            </label>
                            <textarea
                              rows={2}
                              value={doctorNotes}
                              onChange={(e) => setDoctorNotes(e.target.value)}
                              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm"
                            />
                          </div>
                          <div className="flex gap-3">
                            <Button
                              fullWidth
                              onClick={() =>
                                updateStatus(selected.id, {
                                  status: "approved",
                                  approvedDays,
                                  doctorNotes,
                                })
                              }
                              disabled={actionLoading}
                            >
                              Approve & Send Certificate
                            </Button>
                          </div>
                          <Button
                            variant="outline"
                            fullWidth
                            onClick={() =>
                              updateStatus(selected.id, {
                                status: "needs_followup",
                                doctorNotes:
                                  doctorNotes ||
                                  "Please provide additional clinical details.",
                              })
                            }
                            disabled={actionLoading}
                          >
                            Request Follow-up Info
                          </Button>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                              Decline reason
                            </label>
                            <textarea
                              rows={2}
                              value={declineReason}
                              onChange={(e) => setDeclineReason(e.target.value)}
                              placeholder="Clinical reason for declining..."
                              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm"
                            />
                          </div>
                          <Button
                            variant="outline"
                            fullWidth
                            onClick={() =>
                              updateStatus(selected.id, {
                                status: "declined",
                                declineReason,
                              })
                            }
                            disabled={actionLoading || !declineReason}
                          >
                            Decline Request
                          </Button>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                              Confirm consultation slot
                            </label>
                            <input
                              type="datetime-local"
                              value={slotDateTime}
                              onChange={(e) => setSlotDateTime(e.target.value)}
                              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm"
                            />
                            <p className="mt-1 text-xs text-slate-400">
                              Patient preferred: {selected.telehealth?.preferredTime || "asap"}
                            </p>
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                              Notes for patient (optional)
                            </label>
                            <textarea
                              rows={2}
                              value={doctorNotes}
                              onChange={(e) => setDoctorNotes(e.target.value)}
                              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm"
                            />
                          </div>
                          <Button
                            fullWidth
                            onClick={() => {
                              if (!slotDateTime) {
                                setMessage("Please select a slot date and time");
                                return;
                              }
                              updateStatus(selected.id, {
                                status: "scheduled",
                                doctorNotes,
                                telehealthSlot: {
                                  scheduledAt: new Date(slotDateTime).toISOString(),
                                  doctorName: user?.name || "Doctor",
                                  notes: doctorNotes || undefined,
                                },
                              });
                            }}
                            disabled={actionLoading}
                          >
                            Confirm Slot & Message Patient
                          </Button>
                          <Button
                            variant="outline"
                            fullWidth
                            onClick={() =>
                              updateStatus(selected.id, {
                                status: "completed",
                                doctorNotes,
                              })
                            }
                            disabled={actionLoading}
                          >
                            Mark Consultation Complete
                          </Button>
                        </>
                      )}
                      {message && (
                        <p className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">
                          {message}
                        </p>
                      )}
                    </div>
                  )}

                  {selected.status === "scheduled" && selected.telehealthSlot && (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl bg-teal-50 p-4 text-sm text-teal-800">
                        Slot confirmed for{" "}
                        {new Date(selected.telehealthSlot.scheduledAt).toLocaleString("en-IN")}
                        . Patient notified by SMS & email.
                      </div>
                      <Button
                        fullWidth
                        onClick={() =>
                          updateStatus(selected.id, {
                            status: "completed",
                            doctorNotes,
                          })
                        }
                        disabled={actionLoading}
                      >
                        Mark Consultation Complete
                      </Button>
                    </div>
                  )}

                  {selected.status === "approved" && (
                    <div className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-800">
                      Certificate approved for {selected.approvedDays} days. Sent via
                      SMS and email to {selected.patient.phone} / {selected.patient.email}.
                    </div>
                  )}

                  {selected.status === "declined" && (
                    <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">
                      Declined: {selected.declineReason}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-slate-400">
                  Select a request to review
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
