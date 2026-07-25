import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <div className="mb-3">
              <BrandLogo size="sm" />
            </div>
            <p className="text-sm text-slate-500">
              Online medical certificates and telehealth consultations with
              NMC-registered doctors across India.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-900">Services</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>
                <Link href="/medical-certificate" className="hover:text-teal-600">
                  Medical Certificate
                </Link>
              </li>
              <li>
                <Link href="/telehealth" className="hover:text-teal-600">
                  Telehealth Consultation
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-900">Important</h4>
            <p className="text-sm text-slate-500">
              Certificates are issued at a doctor&apos;s clinical discretion. Not all
              requests are approved. This is not an emergency service — dial 112 if
              you need urgent care.
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Sanavo. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
