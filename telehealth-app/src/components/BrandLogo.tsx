import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  /** Show the "Sanavo" wordmark next to the mark */
  showWordmark?: boolean;
  /** Header (default) or footer sizing */
  size?: "sm" | "md";
  className?: string;
};

const sizes = {
  sm: { px: 36, word: "text-base" },
  md: { px: 44, word: "text-lg" },
} as const;

export default function BrandLogo({
  showWordmark = true,
  size = "md",
  className = "",
}: BrandLogoProps) {
  const s = sizes[size];

  return (
    <Link href="/" className={`flex items-center gap-2.5 ${className}`}>
      <span
        className="relative shrink-0 overflow-hidden rounded-full bg-white p-1 ring-1 ring-slate-200/80"
        style={{ width: s.px, height: s.px }}
      >
        <Image
          src="/sanavo-logo.png"
          alt="Sanavo"
          fill
          sizes={`${s.px}px`}
          className="object-contain object-center p-0.5"
          priority={size === "md"}
        />
      </span>
      {showWordmark && (
        <span
          className={`font-semibold tracking-tight text-slate-900 ${s.word}`}
        >
          Sanavo
        </span>
      )}
    </Link>
  );
}
