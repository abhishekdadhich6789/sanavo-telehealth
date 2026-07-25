import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { PRICES, formatINR } from "@/lib/constants";

const steps = [
  {
    title: "Choose certificate type",
    description:
      "Select work, school/university, or carer's leave. Request your consult online in minutes.",
  },
  {
    title: "Fill a quick questionnaire",
    description:
      "Explain your symptoms, situation, and the dates you need covered. Takes only a few minutes.",
  },
  {
    title: "Doctor reviews your request",
    description:
      "An NMC-registered partner doctor reviews your request and may call you with follow-up questions.",
  },
  {
    title: "Doctor decides eligibility",
    description:
      "A certificate is not guaranteed. The doctor uses clinical judgement on suitability and days covered.",
  },
  {
    title: "Certificate sent digitally",
    description:
      "If approved, your medical certificate is delivered straight to your phone via SMS and email.",
  },
];

export default function Home() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm backdrop-blur">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-300" />
                Doctors available now
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Healthcare from anywhere in India
              </h1>
              <p className="mt-6 text-lg text-teal-100">
                Get an online medical certificate or speak with an NMC-registered
                doctor — 100% online, fast, and hassle-free.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/medical-certificate"
                  className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
                >
                  Request Medical Certificate
                </Link>
                <Link
                  href="/telehealth"
                  className="rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Book Telehealth Consult
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-900">Our Services</h2>
            <p className="mt-3 text-slate-500">
              Two simple ways to access quality healthcare online
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <Link
              href="/medical-certificate"
              className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:border-teal-200 hover:shadow-md"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-2xl">
                📋
              </div>
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-teal-700">
                Online Medical Certificate
              </h3>
              <p className="mt-2 text-slate-500">
                Work, school/university, or carer&apos;s leave certificates — reviewed by
                the fastest available partner doctor and delivered via SMS and email.
              </p>
              <p className="mt-4 text-sm font-semibold text-teal-600">
                From {formatINR(PRICES.medicalCertificate)} →
              </p>
            </Link>

            <Link
              href="/telehealth"
              className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:border-teal-200 hover:shadow-md"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
                🩺
              </div>
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-teal-700">
                Telehealth Consultation
              </h3>
              <p className="mt-2 text-slate-500">
                Choose your NMC-registered partner doctor and speak with them by phone
                about your health concerns, advice, and treatment options.
              </p>
              <p className="mt-4 text-sm font-semibold text-teal-600">
                From {formatINR(PRICES.telehealth)} →
              </p>
            </Link>
          </div>
        </section>

        {/* How it works - Medical Certificate */}
        <section className="bg-slate-50 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold text-slate-900">
                How Medical Certificates Work
              </h2>
              <p className="mt-3 text-slate-500">
                Same trusted process used by leading Indian telehealth platforms
              </p>
            </div>

            <div className="space-y-6">
              {steps.map((step, index) => (
                <div
                  key={step.title}
                  className="flex gap-6 rounded-2xl border border-slate-200 bg-white p-6"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{step.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/medical-certificate"
                className="inline-flex rounded-xl bg-teal-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                Start Your Request
              </Link>
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="rounded-2xl bg-teal-600 p-8 text-center text-white sm:p-12">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Real doctors behind your care
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-teal-100">
              Every request is reviewed by an NMC-registered partner doctor. We
              comply with National Medical Commission guidelines for medical
              certificates and prioritise safe, patient-centred care.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-8 text-sm">
              <div>
                <div className="text-2xl font-bold">24/7</div>
                <div className="text-teal-200">Request online</div>
              </div>
              <div>
                <div className="text-2xl font-bold">~1 hr</div>
                <div className="text-teal-200">Typical review time</div>
              </div>
              <div>
                <div className="text-2xl font-bold">100%</div>
                <div className="text-teal-200">Online & digital</div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
