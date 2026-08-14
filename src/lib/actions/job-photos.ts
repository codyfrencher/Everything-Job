"use server";

import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

async function assertCanAccessJob(jobId: string) {
  const user = await requireUser();
  if (user.role === "TECH") {
    const assignment = await db.jobAssignment.findUnique({
      where: { jobId_userId: { jobId, userId: user.id } },
    });
    if (!assignment) {
      throw new Error("Not authorized");
    }
  }
  return user;
}

export async function uploadJobPhoto(jobId: string, formData: FormData) {
  const user = await assertCanAccessJob(jobId);

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "No file provided" };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Unsupported file type" };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: "Photo is too large (max 10MB)" };
  }

  try {
    const blob = await put(file.name, file, {
      access: "public",
      addRandomSuffix: true,
    });

    await db.jobPhoto.create({
      data: { jobId, url: blob.url, uploadedById: user.id },
    });
  } catch (err) {
    console.error("uploadJobPhoto failed", err);
    return { error: "Upload failed. Please try again." };
  }

  revalidatePath(`/jobs/${jobId}`);
}

export async function deleteJobPhoto(photoId: string) {
  const photo = await db.jobPhoto.findUnique({ where: { id: photoId } });
  if (!photo) return;

  await assertCanAccessJob(photo.jobId);

  await db.jobPhoto.delete({ where: { id: photoId } });
  await del(photo.url).catch(() => {});

  revalidatePath(`/jobs/${photo.jobId}`);
}
