import { prisma } from "@/lib/db";
import { CreateDoctorInput, User, UserRole } from "./types";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from "./password";

const DEFAULT_ADMIN = {
  email: "admin@sanavo.in",
  password: "Admin@123",
  name: "System Admin",
};

export async function ensureDefaultAdmin() {
  const count = await prisma.user.count();
  if (count > 0) return;

  const passwordHash = await hashPassword(DEFAULT_ADMIN.password);
  await prisma.user.create({
    data: {
      email: DEFAULT_ADMIN.email,
      passwordHash,
      role: "admin",
      name: DEFAULT_ADMIN.name,
      active: true,
      // Force change of seeded default password on first login
      mustChangePassword: true,
    },
  });
}

export async function getAllUsers(): Promise<User[]> {
  await ensureDefaultAdmin();
  return prisma.user.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getUserByEmail(email: string): Promise<User | null> {
  await ensureDefaultAdmin();
  return prisma.user.findFirst({
    where: { email: email.toLowerCase() },
  });
}

export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function verifyCredentials(
  email: string,
  password: string
): Promise<User | null> {
  const user = await getUserByEmail(email);
  if (!user || !user.active) return null;

  const result = await verifyPassword(password, user.passwordHash);
  if (!result.ok) return null;

  // Upgrade legacy hashes (no pepper / lower cost) on successful login
  if (result.needsRehash) {
    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
  }

  return user;
}

export async function createDoctor(
  input: CreateDoctorInput,
  createdBy: string
): Promise<User> {
  const strength = validatePasswordStrength(input.password);
  if (!strength.ok) throw new Error(strength.error);

  const existing = await prisma.user.findFirst({
    where: { email: input.email.toLowerCase() },
  });
  if (existing) throw new Error("A user with this email already exists");

  const existingNmc = await prisma.user.findFirst({
    where: {
      role: "doctor",
      nmcNumber: input.nmcNumber.toUpperCase(),
    },
  });
  if (existingNmc) {
    throw new Error("A partner with this NMC number already exists");
  }

  const passwordHash = await hashPassword(input.password);
  return prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      role: "doctor",
      name: input.name,
      nmcNumber: input.nmcNumber.toUpperCase(),
      phone: input.phone,
      active: true,
      mustChangePassword: true,
      createdBy,
    },
  });
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getUserById(userId);
  if (!user) return { ok: false, error: "User not found" };

  const current = await verifyPassword(currentPassword, user.passwordHash);
  if (!current.ok) return { ok: false, error: "Current password is incorrect" };

  const strength = validatePasswordStrength(newPassword);
  if (!strength.ok) return { ok: false, error: strength.error };

  if (currentPassword === newPassword) {
    return {
      ok: false,
      error: "New password must be different from the temporary password",
    };
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      mustChangePassword: false,
    },
  });

  return { ok: true };
}

export async function getDoctors(): Promise<User[]> {
  return prisma.user.findMany({
    where: { role: "doctor" },
    orderBy: { createdAt: "desc" },
  });
}

export async function toggleDoctorActive(
  doctorId: string,
  active: boolean
): Promise<User | null> {
  const doctor = await prisma.user.findFirst({
    where: { id: doctorId, role: "doctor" },
  });
  if (!doctor) return null;

  return prisma.user.update({
    where: { id: doctorId },
    data: { active },
  });
}

/** Admin sets a new temporary password; doctor must change it on next login. */
export async function resetDoctorPassword(
  doctorId: string,
  newPassword: string
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const strength = validatePasswordStrength(newPassword);
  if (!strength.ok) return { ok: false, error: strength.error };

  const doctor = await prisma.user.findFirst({
    where: { id: doctorId, role: "doctor" },
  });
  if (!doctor) return { ok: false, error: "Doctor not found" };

  const passwordHash = await hashPassword(newPassword);
  const user = await prisma.user.update({
    where: { id: doctorId },
    data: {
      passwordHash,
      mustChangePassword: true,
      active: true,
    },
  });

  return { ok: true, user };
}

export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    role: user.role as UserRole,
    name: user.name,
    nmcNumber: user.nmcNumber,
    phone: user.phone,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt.toISOString(),
  };
}
