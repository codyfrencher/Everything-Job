"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/require-user";
import { jobSchema } from "@/lib/validators";
import type { JobStatus } from "@prisma/client";

export type FormState = { error?: string } | undefined;

function parseJobForm(formData: FormData) {
  const assignedToId = formData.get("assignedToId");
  return jobSchema.parse({
    title: formData.get("title"),
    description: formData.get("description"),
    customerId: formData.get("customerId"),
    assignedToId: assignedToId === "unassigned" ? "" : assignedToId,
    status: formData.get("status"),
    scheduledStart: formData.get("scheduledStart"),
    scheduledEnd: formData.get("scheduledEnd"),
    street: formData.get("street"),
    city: formData.get("city"),
    state: formData.get("state"),
    zip: formData.get("zip"),
    notes: formData.get("notes"),
  });
}

function toJobData(data: ReturnType<typeof parseJobForm>) {
  return {
    title: data.title,
    description: data.description || null,
    customerId: data.customerId,
    assignedToId: data.assignedToId || null,
    status: data.status,
    scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : null,
    scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : null,
    street: data.street || null,
    city: data.city || null,
    state: data.state || null,
    zip: data.zip || null,
    notes: data.notes || null,
  };
}

export async function createJob(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("ADMIN", "DISPATCHER");

  let job;
  try {
    const data = parseJobForm(formData);
    job = await db.job.create({ data: toJobData(data) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.issues[0]?.message ?? "Invalid job details" };
    }
    return { error: "Could not create job" };
  }

  revalidatePath("/jobs");
  revalidatePath("/schedule");
  revalidatePath("/");
  redirect(`/jobs/${job.id}`);
}

export async function updateJob(
  jobId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  try {
    const data = parseJobForm(formData);

    if (user.role === "TECH") {
      const existing = await db.job.findUnique({ where: { id: jobId } });
      if (!existing || existing.assignedToId !== user.id) {
        return { error: "Not authorized" };
      }
    }

    await db.job.update({ where: { id: jobId }, data: toJobData(data) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.issues[0]?.message ?? "Invalid job details" };
    }
    return { error: "Could not update job" };
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/schedule");
  revalidatePath("/");
}

export async function updateJobStatus(jobId: string, status: JobStatus) {
  const user = await requireUser();

  if (user.role === "TECH") {
    const existing = await db.job.findUnique({ where: { id: jobId } });
    if (!existing || existing.assignedToId !== user.id) {
      throw new Error("Not authorized");
    }
  }

  await db.job.update({ where: { id: jobId }, data: { status } });

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/schedule");
  revalidatePath("/");
}

export async function assignJob(jobId: string, assignedToId: string | null) {
  await requireRole("ADMIN", "DISPATCHER");
  await db.job.update({
    where: { id: jobId },
    data: {
      assignedToId,
      status: assignedToId ? "SCHEDULED" : "UNSCHEDULED",
    },
  });

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/schedule");
  revalidatePath("/");
}

export async function deleteJob(jobId: string) {
  await requireRole("ADMIN", "DISPATCHER");
  await db.job.delete({ where: { id: jobId } });
  revalidatePath("/jobs");
  revalidatePath("/schedule");
  redirect("/jobs");
}
