"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-user";
import { materialSchema } from "@/lib/validators";

export type MaterialFormState = { error?: string } | undefined;

function parseMaterialForm(formData: FormData) {
  return materialSchema.parse({
    name: formData.get("name"),
    unit: formData.get("unit"),
    calcType: formData.get("calcType"),
    rate: formData.get("rate"),
    unitCost: formData.get("unitCost"),
  });
}

export async function createMaterial(
  _prevState: MaterialFormState,
  formData: FormData,
): Promise<MaterialFormState> {
  await requireRole("ADMIN");

  try {
    const data = parseMaterialForm(formData);
    await db.material.create({ data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.issues[0]?.message ?? "Invalid material details" };
    }
    return { error: "Could not add material" };
  }

  revalidatePath("/", "layout");
}

export async function updateMaterial(
  materialId: string,
  _prevState: MaterialFormState,
  formData: FormData,
): Promise<MaterialFormState> {
  await requireRole("ADMIN");

  try {
    const data = parseMaterialForm(formData);
    await db.material.update({ where: { id: materialId }, data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.issues[0]?.message ?? "Invalid material details" };
    }
    return { error: "Could not update material" };
  }

  // A price/rate change here changes every job's materials estimate, not
  // just one path — same "revalidatePath doesn't cascade" lesson as the
  // deactivated-tech fix, so this clears the whole cache instead of
  // guessing which job pages to target individually.
  revalidatePath("/", "layout");
}

export async function archiveMaterial(materialId: string) {
  await requireRole("ADMIN");
  await db.material.update({
    where: { id: materialId },
    data: { archivedAt: new Date() },
  });
  revalidatePath("/", "layout");
}

export async function restoreMaterial(materialId: string) {
  await requireRole("ADMIN");
  await db.material.update({
    where: { id: materialId },
    data: { archivedAt: null },
  });
  revalidatePath("/", "layout");
}
