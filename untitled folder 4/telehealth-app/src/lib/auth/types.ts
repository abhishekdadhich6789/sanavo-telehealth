export type UserRole = "admin" | "doctor";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  name: string;
  nmcNumber: string | null;
  phone: string | null;
  active: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  createdBy: string | null;
}

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  mustChangePassword?: boolean;
}

export interface CreateDoctorInput {
  email: string;
  password: string;
  name: string;
  nmcNumber: string;
  phone?: string;
}
