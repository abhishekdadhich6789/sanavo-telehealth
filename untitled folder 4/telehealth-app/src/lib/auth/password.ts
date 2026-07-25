import bcrypt from "bcryptjs";
import { assertProductionSecrets } from "@/lib/config";

/**
 * Password security:
 * - bcrypt with a unique random salt per password (embedded in the hash)
 * - cost factor 12 (2^12 rounds) — slower to crack, still fine for login
 * - optional app-level pepper (PASSWORD_PEPPER) mixed in before hashing
 *
 * Plaintext passwords are never stored. Only the bcrypt hash is kept in DB.
 */

const BCRYPT_COST = 12;

function getPepper(): string {
  return process.env.PASSWORD_PEPPER || process.env.JWT_SECRET || "sanavo-dev-pepper";
}

/** Mix password with server-side pepper before bcrypt (defense in depth). */
function pepperPassword(password: string): string {
  return `${password}${getPepper()}`;
}

/**
 * Hash a password with a fresh random salt.
 * bcrypt.genSalt creates the salt; bcrypt.hash embeds salt + hash together.
 */
export async function hashPassword(password: string): Promise<string> {
  assertProductionSecrets();
  const salt = await bcrypt.genSalt(BCRYPT_COST);
  return bcrypt.hash(pepperPassword(password), salt);
}

export type VerifyPasswordResult =
  | { ok: true; needsRehash: boolean }
  | { ok: false };

/**
 * Compare plaintext password against stored bcrypt hash.
 * Supports legacy hashes (no pepper / older cost) and flags them for upgrade.
 */
export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<VerifyPasswordResult> {
  // Current scheme: pepper + cost 12
  if (await bcrypt.compare(pepperPassword(password), passwordHash)) {
    const needsRehash = !passwordHash.startsWith(`$2a$${BCRYPT_COST}$`) &&
      !passwordHash.startsWith(`$2b$${BCRYPT_COST}$`);
    return { ok: true, needsRehash };
  }

  // Legacy: plain bcrypt without pepper (from earlier builds)
  if (await bcrypt.compare(password, passwordHash)) {
    return { ok: true, needsRehash: true };
  }

  return { ok: false };
}

export type PasswordStrengthResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Strong password rules for partner / admin accounts.
 * Min 10 chars, upper + lower + number + special character.
 */
export function validatePasswordStrength(password: string): PasswordStrengthResult {
  if (password.length < 10) {
    return { ok: false, error: "Password must be at least 10 characters" };
  }
  if (password.length > 128) {
    return { ok: false, error: "Password must be at most 128 characters" };
  }
  if (!/[a-z]/.test(password)) {
    return { ok: false, error: "Password must include a lowercase letter" };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, error: "Password must include an uppercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, error: "Password must include a number" };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return {
      ok: false,
      error: "Password must include a special character (e.g. !@#$%)",
    };
  }
  return { ok: true };
}

export const PASSWORD_HINT =
  "At least 10 characters, with uppercase, lowercase, number, and special character.";
