"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-user";
import { userSchema } from "@/lib/validators";

export type FormState = { error?: string } | undefined;

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
