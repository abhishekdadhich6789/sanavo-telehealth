import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <BrandLogo size="md" />

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <Link href="/medical-certificate" className="transition hover:text-teal-600">
            Medical Certificate
          </Link>
          <Link href="/telehealth" className="transition hover:text-teal-600">
            Telehealth
          </Link>
          <Link href="/login" className="transition hover:text-teal-600">
            Partner Login
          </Link>
        </nav>

        <Link
          href="/medical-certificate"
          className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
        >
          Get Started
        </Link>
      </div>
    </header>
  );
}
