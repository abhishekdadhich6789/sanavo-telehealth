import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { assertProductionSecrets } from "@/lib/config";
import { SessionUser } from "./types";

const COOKIE_NAME = "sanavo_session";
const DEV_FALLBACK_SECRET = "dev-secret-change-in-production";

function getSecret() {
  const secret = process.env.JWT_SECRET || DEV_FALLBACK_SECRET;
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  assertProductionSecrets();
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .setIssuedAt()
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}

export const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours
