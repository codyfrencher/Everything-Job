"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-user";
import { editUserSchema, userSchema } from "@/lib/validators";

export type FormState = { error?: string } | undefined;

export type PasswordResetState = { error?: string; success?: boolean } | undefined;

export type UpdateUserState = { error?: string; success?: boolean } | undefined;

export async function resetTeamMemberPassword(
  userId: string,
  _prevState: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  await requireRole("ADMIN");

  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.user.update({ where: { id: userId }, data: { passwordHash } });

  return { success: true };
}

export async function createTeamMember(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("ADMIN");

  try {
    const data = userSchema.parse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      role: formData.get("role"),
      phone: formData.get("phone"),
    });

    const passwordHash = await bcrypt.hash(data.password, 10);

    await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        phone: data.phone || null,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.issues[0]?.message ?? "Invalid team member details" };
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { error: "A team member with that email already exists" };
    }
    return { error: "Could not create team member" };
  }

  revalidatePath("/team");
}

export async function updateTeamMember(
  userId: string,
  _prevState: UpdateUserState,
  formData: FormData,
): Promise<UpdateUserState> {
  await requireRole("ADMIN");

  try {
    const data = editUserSchema.parse({
      name: formData.get("name"),
      email: formData.get("email"),
      role: formData.get("role"),
      phone: formData.get("phone"),
    });

    await db.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        phone: data.phone || null,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.issues[0]?.message ?? "Invalid team member details" };
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { error: "A team member with that email already exists" };
    }
    return { error: "Could not update team member" };
  }

  // A name/role change is visible anywhere this tech is listed, not just
  // Team — same staleness issue as deactivate/reactivate below.
  revalidatePath("/", "layout");
  return { success: true };
}

export async function deactivateTeamMember(userId: string) {
  const admin = await requireRole("ADMIN");

  if (userId === admin.id) {
    throw new Error("You can't deactivate your own account");
  }

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return;

  if (target.role === "ADMIN") {
    const activeAdmins = await db.user.count({
      where: { role: "ADMIN", deactivatedAt: null },
    });
    if (activeAdmins <= 1) {
      throw new Error("Can't deactivate the last active admin");
    }
  }

  await db.user.update({
    where: { id: userId },
    data: { deactivatedAt: new Date() },
  });

  // Whether a tech is deactivated affects every page that lists assignable
  // techs (Schedule, Jobs, the dashboard, individual job pages) — not just
  // Team, where revalidatePath("/team") alone previously left those other
  // pages serving a stale cached render even after the change took effect.
  revalidatePath("/", "layout");
}

export async function reactivateTeamMember(userId: string) {
  await requireRole("ADMIN");

  await db.user.update({
    where: { id: userId },
    data: { deactivatedAt: null },
  });

  revalidatePath("/", "layout");
}
