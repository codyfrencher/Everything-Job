"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/require-user";
import { notifyUser } from "@/lib/push";
import { jobSchema, techJobUpdateSchema } from "@/lib/validators";
import {
  assertNoOverlap,
  assertValidJobState,
  assertValidTimeRange,
} from "@/lib/job-rules";
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

async function assertAssignableTech(userId: string | null) {
  if (!userId) return null;
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "TECH") {
    return "Jobs can only be assigned to a Tech";
  }
  return null;
}

export async function createJob(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("ADMIN", "DISPATCHER");

  let job;
  try {
    const data = parseJobForm(formData);
    const jobData = toJobData(data);

    const assignableError = await assertAssignableTech(jobData.assignedToId);
    if (assignableError) return { error: assignableError };

    const timeError = assertValidTimeRange(
      jobData.scheduledStart,
      jobData.scheduledEnd,
    );
    if (timeError) return { error: timeError };

    const stateError = assertValidJobState(jobData);
    if (stateError) return { error: stateError };

    const overlapError = await assertNoOverlap({
      assignedToId: jobData.assignedToId,
      scheduledStart: jobData.scheduledStart,
      scheduledEnd: jobData.scheduledEnd,
    });
    if (overlapError) return { error: overlapError };

    job = await db.job.create({ data: jobData });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.issues[0]?.message ?? "Invalid job details" };
    }
    return { error: "Could not create job" };
  }

  if (job.assignedToId) {
    await notifyUser(job.assignedToId, {
      title: "New job assigned",
      body: job.title,
      url: `/jobs/${job.id}`,
    });
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
  let newlyAssignedToId: string | null = null;

  try {
    const existing = await db.job.findUnique({ where: { id: jobId } });
    if (!existing) {
      return { error: "Job not found" };
    }

    const isTech = user.role === "TECH";
    if (isTech && existing.assignedToId !== user.id) {
      return { error: "Not authorized" };
    }

    // Techs may only change status and notes — parsed with a schema that
    // doesn't even accept the other fields, regardless of what the form
    // submitted. Everyone else uses the full job schema.
    let jobData: ReturnType<typeof toJobData>;
    if (isTech) {
      const data = techJobUpdateSchema.parse({
        status: formData.get("status"),
        notes: formData.get("notes"),
      });
      jobData = {
        title: existing.title,
        description: existing.description,
        customerId: existing.customerId,
        assignedToId: existing.assignedToId,
        status: data.status,
        scheduledStart: existing.scheduledStart,
        scheduledEnd: existing.scheduledEnd,
        street: existing.street,
        city: existing.city,
        state: existing.state,
        zip: existing.zip,
        notes: data.notes || null,
      };
    } else {
      const data = parseJobForm(formData);
      jobData = toJobData(data);

      const assignableError = await assertAssignableTech(jobData.assignedToId);
      if (assignableError) return { error: assignableError };

      if (jobData.assignedToId && jobData.assignedToId !== existing.assignedToId) {
        newlyAssignedToId = jobData.assignedToId;
      }
    }

    const timeError = assertValidTimeRange(
      jobData.scheduledStart,
      jobData.scheduledEnd,
    );
    if (timeError) return { error: timeError };

    const stateError = assertValidJobState(jobData);
    if (stateError) return { error: stateError };

    const overlapError = await assertNoOverlap({
      jobId,
      assignedToId: jobData.assignedToId,
      scheduledStart: jobData.scheduledStart,
      scheduledEnd: jobData.scheduledEnd,
    });
    if (overlapError) return { error: overlapError };

    await db.job.update({ where: { id: jobId }, data: jobData });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.issues[0]?.message ?? "Invalid job details" };
    }
    return { error: "Could not update job" };
  }

  if (newlyAssignedToId) {
    const job = await db.job.findUnique({ where: { id: jobId } });
    if (job) {
      await notifyUser(newlyAssignedToId, {
        title: "New job assigned",
        body: job.title,
        url: `/jobs/${jobId}`,
      });
    }
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/schedule");
  revalidatePath("/");
}

export async function updateJobStatus(jobId: string, status: JobStatus) {
  const user = await requireUser();

  const existing = await db.job.findUnique({ where: { id: jobId } });
  if (!existing) throw new Error("Job not found");

  if (user.role === "TECH" && existing.assignedToId !== user.id) {
    throw new Error("Not authorized");
  }

  const stateError = assertValidJobState({
    status,
    assignedToId: existing.assignedToId,
    scheduledStart: existing.scheduledStart,
  });
  if (stateError) throw new Error(stateError);

  await db.job.update({ where: { id: jobId }, data: { status } });

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/schedule");
  revalidatePath("/");
}

export async function assignJob(jobId: string, assignedToId: string | null) {
  await requireRole("ADMIN", "DISPATCHER");

  const assignableError = await assertAssignableTech(assignedToId);
  if (assignableError) throw new Error(assignableError);

  const existing = await db.job.findUnique({ where: { id: jobId } });
  if (!existing) throw new Error("Job not found");

  const overlapError = await assertNoOverlap({
    jobId,
    assignedToId,
    scheduledStart: existing.scheduledStart,
    scheduledEnd: existing.scheduledEnd,
  });
  if (overlapError) throw new Error(overlapError);

  // Only promote UNSCHEDULED -> SCHEDULED when there's already a time set.
  // Never force a status the job's actual data doesn't support (see
  // assertValidJobState) — this is also what keeps an assigned-but-untimed
  // job correctly bucketed under "Unscheduled" on the dispatch board.
  let nextStatus = existing.status;
  if (!assignedToId) {
    if (existing.status === "SCHEDULED" || existing.status === "IN_PROGRESS" || existing.status === "COMPLETED") {
      nextStatus = "UNSCHEDULED";
    }
  } else if (existing.scheduledStart && existing.status === "UNSCHEDULED") {
    nextStatus = "SCHEDULED";
  }

  const job = await db.job.update({
    where: { id: jobId },
    data: { assignedToId, status: nextStatus },
  });

  if (assignedToId && assignedToId !== existing.assignedToId) {
    await notifyUser(assignedToId, {
      title: "New job assigned",
      body: job.title,
      url: `/jobs/${jobId}`,
    });
  }

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
