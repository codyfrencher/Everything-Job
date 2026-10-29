"use server";

import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-user";
import { materialSchema } from "@/lib/validators";

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

export type MaterialFormState = { error?: string } | undefined;

function parseMaterialForm(formData: FormData) {
  const data = materialSchema.parse({
    name: formData.get("name"),
    keywords: formData.get("keywords"),
  });
  return { name: data.name, keywords: data.keywords || null };
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

  // A new/renamed material (or changed keywords) can change what's
  // suggested on every job's checklist — same "revalidatePath doesn't
  // cascade" lesson as the deactivated-tech fix, so this clears the whole
  // cache instead of guessing which job pages to target individually.
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

export async function uploadMaterialPhoto(materialId: string, formData: FormData) {
  await requireRole("ADMIN");

  const material = await db.material.findUnique({ where: { id: materialId } });
  if (!material) throw new Error("Material not found");

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file provided");
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) throw new Error("Unsupported file type");
  if (file.size > MAX_PHOTO_SIZE_BYTES) throw new Error("Photo is too large (max 10MB)");

  const blob = await put(file.name, file, { access: "public", addRandomSuffix: true });

  // Replacing a photo rather than adding to a list — only one reference
  // image per material — so the old blob is cleaned up instead of left
  // orphaned in storage.
  const previousUrl = material.photoUrl;
  await db.material.update({ where: { id: materialId }, data: { photoUrl: blob.url } });
  if (previousUrl) await del(previousUrl).catch(() => {});

  revalidatePath("/", "layout");
}

export async function removeMaterialPhoto(materialId: string) {
  await requireRole("ADMIN");

  const material = await db.material.findUnique({ where: { id: materialId } });
  if (!material) throw new Error("Material not found");
  if (!material.photoUrl) return;

  await db.material.update({ where: { id: materialId }, data: { photoUrl: null } });
  await del(material.photoUrl).catch(() => {});

  revalidatePath("/", "layout");
}

// Checking/unchecking a supply on a job's "what to bring" list — same
// edit permissions as Scope of Work, since deciding what a job needs is
// a dispatch-level judgment call, not something a Tech sets.
export async function toggleJobSupply(jobId: string, materialId: string, checked: boolean) {
  await requireRole("ADMIN", "DISPATCHER");

  if (checked) {
    await db.jobSupply.upsert({
      where: { jobId_materialId: { jobId, materialId } },
      create: { jobId, materialId },
      update: {},
    });
  } else {
    await db.jobSupply.deleteMany({ where: { jobId, materialId } });
  }

  revalidatePath(`/jobs/${jobId}`);
}
