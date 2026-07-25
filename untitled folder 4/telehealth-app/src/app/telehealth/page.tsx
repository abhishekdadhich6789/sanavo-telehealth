"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StepProgress from "@/components/StepProgress";
import Button from "@/components/Button";
import { PatientDetails, TelehealthData } from "@/lib/types";
import { PRICES, formatINR } from "@/lib/constants";
import { isValidIndianPhone, sanitizePhoneInput } from "@/lib/validators";
import { processPaymentCheckout } from "@/lib/payments/usePayment";

const STEPS = ["Reason", "Your Details", "Health Info", "Choose Doctor", "Review"];

const REASONS = [
  "General health advice",
  "Ongoing condition review",
  "New symptoms",
  "Medication review",
  "Mental health concerns",
  "Follow-up from previous visit",
  "Other",
];

interface PartnerDoctor {
  id: string;
  name: string;
  nmcNumber: string | null;
  avgResponseMinutes: number | null;
}

export default function TelehealthPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [doctors, setDoctors] = useState<PartnerDoctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);

  const [patient, setPatient] = useState<PatientDetails>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
  });
  const [telehealth, setTelehealth] = useState<TelehealthData>({
    reason: "",
    symptoms: "",
    duration: "",
    medications: "",
    preferredTime: "asap",
    additionalNotes: "",
    preferredDoctorId: "",
    preferredDoctorName: "",
  });

  useEffect(() => {
    fetch("/api/partners")
      .then((res) => res.json())
      .then((data) => {
        setDoctors(Array.isArray(data) ? data : []);
        setDoctorsLoading(false);
      })
      .catch(() => setDoctorsLoading(false));
  }, []);

  const updatePatient = (field: keyof PatientDetails, value: string) => {
    setPatient((p) => ({ ...p, [field]: value }));
  };

  const updateTelehealth = (field: keyof TelehealthData, value: string) => {
    setTelehealth((t) => ({ ...t, [field]: value }));
  };

  const selectDoctor = (doc: PartnerDoctor) => {
    setTelehealth((t) => ({
      ...t,
      preferredDoctorId: doc.id,
      preferredDoctorName: doc.name,
    }));
  };

  const canProceed = () => {
    if (step === 1) return !!telehealth.reason;
    if (step === 2) {
      return (
        !!patient.firstName &&
        !!patient.lastName &&
        !!patient.email &&
        isValidIndianPhone(patient.phone) &&
        !!patient.dateOfBirth
      );
    }
    if (step === 3) return !!telehealth.symptoms && !!telehealth.duration;
    if (step === 4) return !!telehealth.preferredDoctorId;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    await processPaymentCheckout({
      router,
      serviceType: "telehealth",
      amount: PRICES.telehealth,
      serviceLabel: "Telehealth Consultation",
      patient,
      requestPayload: {
        type: "telehealth",
        patient,
        telehealth,
      },
      onError: (message) => {
        setError(message);
        setSubmitting(false);
      },
      onFinally: () => setSubmitting(false),
    });
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Telehealth Consultation</h1>
          <p className="mt-2 text-slate-500">
            Choose your partner doctor and book a phone consultation
          </p>
        </div>

        <StepProgress steps={STEPS} currentStep={step} />

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {step === 1 && (
            <div>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">
                What do you need help with?
              </h2>
              <p className="mb-6 text-sm text-slate-500">
                Select the main reason for your consultation
              </p>
              <div className="space-y-2">
                {REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => updateTelehealth("reason", reason)}
                    className={`w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition ${
                      telehealth.reason === reason
                        ? "border-teal-600 bg-teal-50 text-teal-800"
                        : "border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">Your details</h2>
              <p className="mb-6 text-sm text-slate-500">
                The doctor will call you on this number
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    First name
                  </label>
                  <input
                    type="text"
                    value={patient.firstName}
                    onChange={(e) => updatePatient("firstName", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={patient.lastName}
                    onChange={(e) => updatePatient("lastName", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={patient.email}
                    onChange={(e) => updatePatient("email", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Mobile number
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="98XXXXXXXX"
                    value={patient.phone}
                    onChange={(e) =>
                      updatePatient("phone", sanitizePhoneInput(e.target.value))
                    }
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-100 ${
                      patient.phone && !isValidIndianPhone(patient.phone)
                        ? "border-red-400 focus:border-red-500"
                        : "border-slate-300 focus:border-teal-500"
                    }`}
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    10-digit Indian mobile only (starts with 6–9)
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Date of birth
                  </label>
                  <input
                    type="date"
                    value={patient.dateOfBirth}
                    onChange={(e) => updatePatient("dateOfBirth", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">
                Tell us about your health
              </h2>
              <p className="mb-6 text-sm text-slate-500">
                Help the doctor prepare for your consultation
              </p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Describe your symptoms or concerns
                  </label>
                  <textarea
                    rows={4}
                    value={telehealth.symptoms}
                    onChange={(e) => updateTelehealth("symptoms", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    How long have you had these symptoms?
                  </label>
                  <select
                    value={telehealth.duration}
                    onChange={(e) => updateTelehealth("duration", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="">Select duration</option>
                    <option value="Less than 24 hours">Less than 24 hours</option>
                    <option value="1-3 days">1–3 days</option>
                    <option value="4-7 days">4–7 days</option>
                    <option value="1-2 weeks">1–2 weeks</option>
                    <option value="More than 2 weeks">More than 2 weeks</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Current medications (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="List any medications you take"
                    value={telehealth.medications}
                    onChange={(e) => updateTelehealth("medications", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Preferred contact time
                  </label>
                  <select
                    value={telehealth.preferredTime}
                    onChange={(e) => updateTelehealth("preferredTime", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="asap">As soon as possible</option>
                    <option value="morning">Morning (6am – 12pm)</option>
                    <option value="afternoon">Afternoon (12pm – 5pm)</option>
                    <option value="evening">Evening (5pm – 9pm)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Additional notes (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={telehealth.additionalNotes}
                    onChange={(e) => updateTelehealth("additionalNotes", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">
                Choose your partner doctor
              </h2>
              <p className="mb-6 text-sm text-slate-500">
                Select the doctor you want for this telehealth consultation
              </p>

              {doctorsLoading ? (
                <p className="text-sm text-slate-500">Loading available doctors...</p>
              ) : doctors.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  No partner doctors are available yet. Please ask an admin to create a
                  Partner ID first.
                </div>
              ) : (
                <div className="space-y-3">
                  {doctors.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => selectDoctor(doc)}
                      className={`flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition ${
                        telehealth.preferredDoctorId === doc.id
                          ? "border-teal-600 bg-teal-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                        {doc.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">Dr. {doc.name}</div>
                        <div className="text-sm text-slate-500">
                          NMC: {doc.nmcNumber || "Registered"}
                        </div>
                        {doc.avgResponseMinutes != null && (
                          <div className="mt-1 text-xs text-teal-700">
                            Avg. response ~{doc.avgResponseMinutes} min
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">
                Review your consultation request
              </h2>
              <p className="mb-6 text-sm text-slate-500">
                Dr. {telehealth.preferredDoctorName} will call you on your mobile
              </p>

              <div className="space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
                <div>
                  <span className="font-medium text-slate-700">Doctor:</span> Dr.{" "}
                  {telehealth.preferredDoctorName}
                </div>
                <div>
                  <span className="font-medium text-slate-700">Reason:</span>{" "}
                  {telehealth.reason}
                </div>
                <div>
                  <span className="font-medium text-slate-700">Name:</span>{" "}
                  {patient.firstName} {patient.lastName}
                </div>
                <div>
                  <span className="font-medium text-slate-700">Phone:</span>{" "}
                  {patient.phone}
                </div>
                <div>
                  <span className="font-medium text-slate-700">Symptoms:</span>{" "}
                  {telehealth.symptoms}
                </div>
                <div>
                  <span className="font-medium text-slate-700">Preferred time:</span>{" "}
                  {telehealth.preferredTime}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                You&apos;ll receive SMS updates when your selected doctor confirms the
                slot. Keep your phone ready during operating hours (8am – 10pm IST).
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">Consultation fee</span>
                  <span className="text-xl font-bold text-slate-900">
                    {formatINR(PRICES.telehealth)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">UPI</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">Cards</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">Netbanking</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">Wallets</span>
                </div>
              </div>

              <p className="mt-3 text-center text-xs text-slate-400">
                Secured by Razorpay · Pay before your consult is booked
              </p>

              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            </div>
          )}

          <div className="mt-8 flex gap-3">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            <div className="flex-1" />
            {step < 5 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Continue
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting
                  ? "Opening payment..."
                  : `Pay ${formatINR(PRICES.telehealth)} & Book`}
              </Button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
