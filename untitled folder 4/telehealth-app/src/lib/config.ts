/** App URL helpers for patient-facing links in SMS/email. */

export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN.replace(/\/$/, "")}`;
  }
  if (process.env.NODE_ENV === "production") {
    return "https://sanavo.in";
  }
  return "http://localhost:3000";
}

export function getStatusUrl(requestId: string, accessToken: string): string {
  return `${getAppBaseUrl()}/status/${requestId}?token=${accessToken}`;
}

/** Fail closed in production if secrets are missing or still defaults. */
export function assertProductionSecrets() {
  if (process.env.NODE_ENV !== "production") return;
  // Avoid failing `next build` static analysis
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const jwt = process.env.JWT_SECRET;
  if (!jwt || jwt === "dev-secret-change-in-production" || jwt.length < 32) {
    throw new Error(
      "JWT_SECRET must be set to a strong random value (32+ chars) in production"
    );
  }

  const pepper = process.env.PASSWORD_PEPPER;
  if (!pepper || pepper.length < 16) {
    throw new Error(
      "PASSWORD_PEPPER must be set to a strong random value (16+ chars) in production"
    );
  }
}
