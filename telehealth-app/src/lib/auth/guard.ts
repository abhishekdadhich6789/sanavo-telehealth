import { NextResponse } from "next/server";
import { getSessionUser } from "./session";
import { getUserById } from "./users";
import { SessionUser, UserRole } from "./types";

export async function requireAuth(
  roles?: UserRole[],
  options?: { allowPasswordChangePending?: boolean }
): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (roles && !roles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Re-check live account flags (deactivated / forced password change)
  const dbUser = await getUserById(user.id);
  if (!dbUser || !dbUser.active) {
    return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
  }

  if (
    dbUser.mustChangePassword &&
    !options?.allowPasswordChangePending
  ) {
    return NextResponse.json(
      { error: "Password change required", code: "MUST_CHANGE_PASSWORD" },
      { status: 403 }
    );
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role as UserRole,
    name: dbUser.name,
    mustChangePassword: dbUser.mustChangePassword,
  };
}
