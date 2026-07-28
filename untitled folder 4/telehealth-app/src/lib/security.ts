import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Apply baseline browser security headers to every response. */
export function applySecurityHeaders(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const isProd = process.env.NODE_ENV === "production";

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self)"
  );
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.delete("X-Powered-By");

  if (isProd) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  // CSP: allow self + Razorpay checkout + inline styles from Tailwind/Next
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
      "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com",
      "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
      isProd ? "upgrade-insecure-requests" : "",
    ]
      .filter(Boolean)
      .join("; ")
  );

  // Prefer HTTPS in production (Railway already terminates TLS)
  if (
    isProd &&
    request.headers.get("x-forwarded-proto") === "http" &&
    !request.nextUrl.pathname.startsWith("/api/health")
  ) {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = "https:";
    return NextResponse.redirect(httpsUrl, 308);
  }

  return response;
}
