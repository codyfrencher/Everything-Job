"use server";

import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";

async function assertCanAccessJob(jobId: string) {
  const user = await requireUser();
  if (user.role === "TECH") {
    const job = await db.job.findUnique({ where: { id: jobId } });
    if (!job || job.assignedToId !== user.id) {
      throw new Error("Not authorized");
    }
  }
  return user;
}

export async function addJobPhoto(jobId: string, url: string) {
  const user = await assertCanAccessJob(jobId);

  await db.jobPhoto.create({
    data: { jobId, url, uploadedById: user.id },
  });

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
