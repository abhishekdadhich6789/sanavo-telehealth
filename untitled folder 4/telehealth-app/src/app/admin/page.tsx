"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Button from "@/components/Button";
import { ConsultRequest } from "@/lib/types";
import { formatINR } from "@/lib/constants";
import {
  isValidIndianPhone,
  isValidNmcNumber,
  sanitizeNmcInput,
  sanitizePhoneInput,
} from "@/lib/validators";

interface DoctorAccount {
  id: string;
  email: string;
  name: string;
  nmcNumber?: string;
  phone?: string;
  active: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<DoctorAccount[]>([]);
  const [requests, setRequests] = useState<ConsultRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    nmcNumber: "",
    phone: "",
  });

  const fetchDoctors = async () => {
    const res = await fetch("/api/admin/doctors");
    if (res.ok) setDoctors(await res.json());
  };

  const fetchRequests = async () => {
    const res = await fetch("/api/requests");
    if (res.ok) setRequests(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });
    fetchDoctors();
    fetchRequests();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    if (!isValidNmcNumber(form.nmcNumber)) {
      setError(
        "Enter a valid NMC / State Medical Council number (5–20 characters, letters/digits, must include digits). Fake values like 12345 are not allowed."
      );
      setSubmitting(false);
      return;
    }

    if (form.phone && !isValidIndianPhone(form.phone)) {
      setError(
        "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9"
      );
      setSubmitting(false);
      return;
    }

    if (!/^[A-Za-z.\s'-]{2,80}$/.test(form.name.trim())) {
      setError("Name can only contain letters and basic punctuation");
      setSubmitting(false);
      return;
    }

    const res = await fetch("/api/admin/doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        nmcNumber: form.nmcNumber.trim().toUpperCase(),
        phone: form.phone || undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to create doctor");
      setSubmitting(false);
      return;
    }

    setSuccess(
      `Partner ID created for ${data.name}. Login: ${data.email} — share the password you set with them.`
    );
    setForm({ name: "", email: "", password: "", nmcNumber: "", phone: "" });
    setShowForm(false);
    setSubmitting(false);
    fetchDoctors();
  };

  const nmcInvalid = form.nmcNumber.length > 0 && !isValidNmcNumber(form.nmcNumber);
  const phoneInvalid = form.phone.length > 0 && !isValidIndianPhone(form.phone);
  const canSubmit =
    form.name.trim().length >= 2 &&
    form.email.includes("@") &&
    form.password.length >= 10 &&
    /[a-z]/.test(form.password) &&
    /[A-Z]/.test(form.password) &&
    /[0-9]/.test(form.password) &&
    /[^A-Za-z0-9]/.test(form.password) &&
    isValidNmcNumber(form.nmcNumber) &&
    !phoneInvalid;

  const toggleActive = async (id: string, active: boolean) => {
    await fetch(`/api/admin/doctors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    fetchDoctors();
  };

  const resetPassword = async (id: string, name: string) => {
    const next = window.prompt(
      `Set a new temporary password for ${name} (min 10 chars, upper/lower/number/special):`
    );
    if (!next) return;

    setError("");
    setSuccess("");
    const res = await fetch(`/api/admin/doctors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetPassword: next }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to reset password");
      return;
    }
    setSuccess(
      `Temporary password updated for ${name}. They must change it on next login.`
    );
    fetchDoctors();
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Panel</h1>
            <p className="mt-2 text-slate-500">
              Create and manage partner doctor login IDs
            </p>
            {user && (
              <p className="mt-1 text-sm text-slate-400">
                Signed in as {user.name} ({user.email})
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "+ Create Partner ID"}
            </Button>
            <Button variant="secondary" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        {showForm && (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Create Partner Doctor ID
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              This email and temporary password become the partner&apos;s first login.
              They will be required to change the password immediately after signing in.
            </p>

            <form onSubmit={handleCreateDoctor} className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Full name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  NMC registration number
                </label>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={form.nmcNumber}
                  onChange={(e) =>
                    setForm({ ...form, nmcNumber: sanitizeNmcInput(e.target.value) })
                  }
                  placeholder="e.g. MH/2019/12345"
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-100 ${
                    nmcInvalid
                      ? "border-red-400 focus:border-red-500"
                      : "border-slate-300 focus:border-teal-500"
                  }`}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Official NMC / State Medical Council number only (letters, digits, / or -)
                </p>
                {nmcInvalid && (
                  <p className="mt-1 text-xs text-red-600">
                    Invalid NMC number. Use a real registration ID (not 12345 / test values).
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Partner email (login ID)
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Phone (optional)
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: sanitizePhoneInput(e.target.value) })
                  }
                  placeholder="98XXXXXXXX"
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-100 ${
                    phoneInvalid
                      ? "border-red-400 focus:border-red-500"
                      : "border-slate-300 focus:border-teal-500"
                  }`}
                />
                <p className="mt-1 text-xs text-slate-400">
                  10-digit Indian mobile only (starts with 6–9)
                </p>
                {phoneInvalid && (
                  <p className="mt-1 text-xs text-red-600">
                    Enter a valid 10-digit Indian mobile number
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Temporary password
                </label>
                <input
                  type="password"
                  required
                  minLength={10}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Strong temp password — partner must change on first login"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Min 10 chars with uppercase, lowercase, number, and special character. Stored as a bcrypt hash with a unique salt — never in plaintext.
                </p>
              </div>
              {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={submitting || !canSubmit}>
                  {submitting ? "Creating..." : "Create Partner ID"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {success}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">
              Doctor Accounts ({doctors.length})
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Partner IDs that can sign in at Partner Login → Partner Portal
            </p>
          </div>

          {loading ? (
            <p className="p-6 text-slate-500">Loading...</p>
          ) : doctors.length === 0 ? (
            <p className="p-6 text-slate-500">
              No doctor accounts yet. Create one above.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {doctors.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div>
                    <div className="font-medium text-slate-900">{doc.name}</div>
                    <div className="text-sm text-slate-500">{doc.email}</div>
                    <div className="text-xs text-slate-400">
                      NMC: {doc.nmcNumber} · Created{" "}
                      {new Date(doc.createdAt).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        doc.active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {doc.active ? "Active" : "Disabled"}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleActive(doc.id, !doc.active)}
                      className="text-sm text-teal-600 hover:underline"
                    >
                      {doc.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => resetPassword(doc.id, doc.name)}
                      className="text-sm text-slate-600 hover:underline"
                    >
                      Reset password
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">
              All Requests ({requests.length})
            </h2>
          </div>
          {requests.length === 0 ? (
            <p className="p-6 text-slate-500">No patient requests yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.slice(0, 10).map((req) => (
                <div key={req.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-900">
                        {req.patient.firstName} {req.patient.lastName}
                      </div>
                      <div className="text-sm text-slate-500">
                        {req.type === "medical_certificate"
                          ? "Medical Certificate"
                          : "Telehealth"}{" "}
                        · {req.status}
                      </div>
                    </div>
                    <div className="text-sm text-slate-500">
                      {req.payment ? formatINR(req.payment.amount) : "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Default admin credentials:</strong> admin@sanavo.in / Admin@123
          <br />
          Change these in production by updating the admin account or setting environment
          variables.
        </div>
      </main>
      <Footer />
    </>
  );
}
