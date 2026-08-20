import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // The session is a JWT that isn't re-validated against the database on
  // its own, so a user deactivated mid-session would otherwise keep full
  // access until it naturally expires. This keeps deactivation effective
  // immediately rather than only blocking future logins.
  const current = await db.user.findUnique({
    where: { id: session.user.id },
    select: { deactivatedAt: true },
  });
  if (!current) {
    redirect("/login");
  }
  if (current.deactivatedAt) {
    // Not "/login" — the JWT cookie is still technically valid (it isn't
    // revoked, only the account is), and proxy.ts bounces an already
    // "logged in" request away from /login straight back here, which
    // would loop forever. This page is a stable dead end instead.
    redirect("/deactivated");
  }

  return session.user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect("/");
  }
  return user;
}
