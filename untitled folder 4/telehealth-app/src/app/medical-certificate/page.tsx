"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StepProgress from "@/components/StepProgress";
import Button from "@/components/Button";
import { CertificateType, PatientDetails, MedicalCertificateData } from "@/lib/types";
import { PRICES, formatINR } from "@/lib/constants";
import { isValidIndianPhone, sanitizePhoneInput } from "@/lib/validators";
import { processPaymentCheckout } from "@/lib/payments/usePayment";

const STEPS = ["Certificate Type", "Your Details", "Questionnaire", "Review"];

const CERTIFICATE_TYPES: { value: CertificateType; label: string; description: string; icon: string }[] = [
  {
    value: "work",
    label: "Work",
    description: "Sick leave or personal leave for your employer",
    icon: "💼",
  },
  {
    value: "school",
    label: "School / University",
    description: "Absence certificate for education institutions",
    icon: "🎓",
  },
  {
    value: "carer",
    label: "Carer's Leave",
    description: "Caring for an immediate family or household member",
    icon: "❤️",
  },
];

export default function MedicalCertificatePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [certificateType, setCertificateType] = useState<CertificateType | "">("");
  const [patient, setPatient] = useState<PatientDetails>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
  });
  const [questionnaire, setQuestionnaire] = useState<MedicalCertificateData>({
    certificateType: "work",
    symptoms: "",
    situation: "",
    startDate: "",
    daysNeeded: 1,
    employerOrSchool: "",
  });

  const selectType = (type: CertificateType) => {
    setCertificateType(type);
    setQuestionnaire((q) => ({ ...q, certificateType: type }));
  };

  const updatePatient = (field: keyof PatientDetails, value: string) => {
    setPatient((p) => ({ ...p, [field]: value }));
  };

  const updateQuestionnaire = (field: keyof MedicalCertificateData, value: string | number) => {
    setQuestionnaire((q) => ({ ...q, [field]: value }));
  };

  const canProceed = () => {
    if (step === 1) return !!certificateType;
    if (step === 2) {
      return (
        !!patient.firstName &&
        !!patient.lastName &&
        !!patient.email &&
        isValidIndianPhone(patient.phone) &&
        !!patient.dateOfBirth
      );
    }
    if (step === 3) {
      return (
        !!questionnaire.symptoms &&
        !!questionnaire.situation &&
        !!questionnaire.startDate &&
        questionnaire.daysNeeded >= 1 &&
        questionnaire.daysNeeded <= 2
      );
    }
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    await processPaymentCheckout({
      router,
      serviceType: "medical_certificate",
      amount: PRICES.medicalCertificate,
      serviceLabel: "Medical Certificate Consultation",
      patient,
      requestPayload: {
        type: "medical_certificate",
        patient,
        medicalCertificate: {
          ...questionnaire,
          certificateType: certificateType as CertificateType,
        },
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
          <h1 className="text-3xl font-bold text-slate-900">Medical Certificate</h1>
          <p className="mt-2 text-slate-500">
            Request an online medical certificate — the fastest available partner
            doctor will review it
          </p>
        </div>

        <StepProgress steps={STEPS} currentStep={step} />

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {/* Step 1: Certificate Type */}
          {step === 1 && (
            <div>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">
                Choose your certificate type
              </h2>
              <p className="mb-6 text-sm text-slate-500">
                Select the type of medical certificate you need
              </p>
              <div className="space-y-3">
                {CERTIFICATE_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => selectType(type.value)}
                    className={`flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition ${
                      certificateType === type.value
                        ? "border-teal-600 bg-teal-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-2xl">{type.icon}</span>
                    <div>
                      <div className="font-semibold text-slate-900">{type.label}</div>
                      <div className="text-sm text-slate-500">{type.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Personal Details */}
          {step === 2 && (
            <div>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">Your details</h2>
              <p className="mb-6 text-sm text-slate-500">
                We&apos;ll use this to contact you and deliver your certificate
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
                  {patient.phone.length > 0 && !isValidIndianPhone(patient.phone) && (
                    <p className="mt-1 text-xs text-red-600">
                      Enter a valid 10-digit Indian mobile number
                    </p>
                  )}
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

          {/* Step 3: Questionnaire */}
          {step === 3 && (
            <div>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">
                Quick questionnaire
              </h2>
              <p className="mb-6 text-sm text-slate-500">
                Tell us about your symptoms and the dates you need covered. This only
                takes a few minutes.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    What are your symptoms?
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Fever, sore throat, headache..."
                    value={questionnaire.symptoms}
                    onChange={(e) => updateQuestionnaire("symptoms", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Describe your situation
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Explain why you need time off..."
                    value={questionnaire.situation}
                    onChange={(e) => updateQuestionnaire("situation", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Certificate start date
                    </label>
                    <input
                      type="date"
                      value={questionnaire.startDate}
                      onChange={(e) => updateQuestionnaire("startDate", e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Days needed
                    </label>
                    <select
                      value={questionnaire.daysNeeded}
                      onChange={(e) =>
                        updateQuestionnaire("daysNeeded", parseInt(e.target.value))
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
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
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    {certificateType === "school"
                      ? "School / University name"
                      : certificateType === "carer"
                        ? "Person you are caring for"
                        : "Employer name (optional)"}
                  </label>
                  <input
                    type="text"
                    value={questionnaire.employerOrSchool || ""}
                    onChange={(e) => updateQuestionnaire("employerOrSchool", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">
                Review your request
              </h2>
              <p className="mb-6 text-sm text-slate-500">
                Please confirm your details before submitting
              </p>

              <div className="space-y-4 rounded-xl bg-slate-50 p-4 text-sm">
                <div>
                  <span className="font-medium text-slate-700">Certificate type:</span>{" "}
                  {CERTIFICATE_TYPES.find((t) => t.value === certificateType)?.label}
                </div>
                <div>
                  <span className="font-medium text-slate-700">Name:</span>{" "}
                  {patient.firstName} {patient.lastName}
                </div>
                <div>
                  <span className="font-medium text-slate-700">Contact:</span>{" "}
                  {patient.email} · {patient.phone}
                </div>
                <div>
                  <span className="font-medium text-slate-700">Symptoms:</span>{" "}
                  {questionnaire.symptoms}
                </div>
                <div>
                  <span className="font-medium text-slate-700">Period:</span>{" "}
                  {questionnaire.startDate} for {questionnaire.daysNeeded}{" "}
                  {questionnaire.daysNeeded === 1 ? "day" : "days"}
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <strong>Important:</strong> A medical certificate is not guaranteed.
                An NMC-registered doctor will review your request and decide based
                on clinical judgement whether a certificate is suitable and how many
                days it should cover.
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">Consultation fee</span>
                  <span className="text-xl font-bold text-slate-900">
                    {formatINR(PRICES.medicalCertificate)}
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
                Secured by Razorpay · Pay before your request is submitted
              </p>

              {error && (
                <p className="mt-4 text-sm text-red-600">{error}</p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex gap-3">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            <div className="flex-1" />
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Continue
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Opening payment..." : `Pay ${formatINR(PRICES.medicalCertificate)} & Submit`}
              </Button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
