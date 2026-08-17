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
import { parseZonedDateTime } from "@/lib/timezone";
import { logJobAudit } from "@/lib/audit";
import type { JobStatus } from "@prisma/client";

export type FormState = { error?: string } | undefined;

function parseJobForm(formData: FormData) {
  const assignedToIds = formData
    .getAll("assignedToIds")
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  return jobSchema.parse({
    title: formData.get("title"),
    description: formData.get("description"),
    customerId: formData.get("customerId"),
    assignedToIds,
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
    status: data.status,
    scheduledStart: data.scheduledStart
      ? parseZonedDateTime(data.scheduledStart)
      : null,
    scheduledEnd: data.scheduledEnd
      ? parseZonedDateTime(data.scheduledEnd)
      : null,
    street: data.street || null,
    city: data.city || null,
    state: data.state || null,
    zip: data.zip || null,
    notes: data.notes || null,
  };
}

async function assertAssignableTechs(userIds: string[]): Promise<string | null> {
  if (userIds.length === 0) return null;
  const targets = await db.user.findMany({ where: { id: { in: userIds } } });
  if (targets.length !== userIds.length || targets.some((t) => t.role !== "TECH")) {
    return "Jobs can only be assigned to Techs";
  }
  return null;
}

async function assertActiveCustomer(customerId: string): Promise<string | null> {
  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer) return "Selected customer no longer exists";
  if (customer.archivedAt) {
    return `"${customer.name}" is archived — restore them before creating a new job`;
  }
  return null;
}

export async function createJob(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireRole("ADMIN", "DISPATCHER");

  let job;
  let assignedToIds: string[] = [];
  try {
    const data = parseJobForm(formData);
    assignedToIds = data.assignedToIds;
    const jobData = toJobData(data);

    const customerError = await assertActiveCustomer(jobData.customerId);
    if (customerError) return { error: customerError };

    const assignableError = await assertAssignableTechs(assignedToIds);
    if (assignableError) return { error: assignableError };

    const timeError = assertValidTimeRange(
      jobData.scheduledStart,
      jobData.scheduledEnd,
    );
    if (timeError) return { error: timeError };

    const stateError = assertValidJobState({
      status: jobData.status,
      assignedUserIds: assignedToIds,
      scheduledStart: jobData.scheduledStart,
    });
    if (stateError) return { error: stateError };

    const overlapError = await assertNoOverlap({
      assignedUserIds: assignedToIds,
      scheduledStart: jobData.scheduledStart,
      scheduledEnd: jobData.scheduledEnd,
    });
    if (overlapError) return { error: overlapError };

    job = await db.job.create({
      data: {
        ...jobData,
        assignments: { create: assignedToIds.map((userId) => ({ userId })) },
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.issues[0]?.message ?? "Invalid job details" };
    }
    return { error: "Could not create job" };
  }

  await logJobAudit("created", job.id, user.id);

  await Promise.all(
    assignedToIds.map((userId) =>
      notifyUser(userId, {
        title: "New job assigned",
        body: job.title,
        url: `/jobs/${job.id}`,
      }),
    ),
  );

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
  let newlyAssignedIds: string[] = [];

  try {
    const existing = await db.job.findUnique({
      where: { id: jobId },
      include: { assignments: true },
    });
    if (!existing) {
      return { error: "Job not found" };
    }
    const existingAssignedIds = existing.assignments.map((a) => a.userId);

    const isTech = user.role === "TECH";
    if (isTech && !existingAssignedIds.includes(user.id)) {
      return { error: "Not authorized" };
    }

    // Techs may only change status and notes — parsed with a schema that
    // doesn't even accept the other fields, regardless of what the form
    // submitted. Everyone else uses the full job schema.
    let jobData: ReturnType<typeof toJobData>;
    let assignedToIds: string[];
    if (isTech) {
      const data = techJobUpdateSchema.parse({
        status: formData.get("status"),
        notes: formData.get("notes"),
      });
      jobData = {
        title: existing.title,
        description: existing.description,
        customerId: existing.customerId,
        status: data.status,
        scheduledStart: existing.scheduledStart,
        scheduledEnd: existing.scheduledEnd,
        street: existing.street,
        city: existing.city,
        state: existing.state,
        zip: existing.zip,
        notes: data.notes || null,
      };
      assignedToIds = existingAssignedIds;
    } else {
      const data = parseJobForm(formData);
      assignedToIds = data.assignedToIds;
      jobData = toJobData(data);

      if (jobData.customerId !== existing.customerId) {
        const customerError = await assertActiveCustomer(jobData.customerId);
        if (customerError) return { error: customerError };
      }

      const assignableError = await assertAssignableTechs(assignedToIds);
      if (assignableError) return { error: assignableError };

      newlyAssignedIds = assignedToIds.filter((id) => !existingAssignedIds.includes(id));
    }

    const timeError = assertValidTimeRange(
      jobData.scheduledStart,
      jobData.scheduledEnd,
    );
    if (timeError) return { error: timeError };

    const stateError = assertValidJobState({
      status: jobData.status,
      assignedUserIds: assignedToIds,
      scheduledStart: jobData.scheduledStart,
    });
    if (stateError) return { error: stateError };

    const overlapError = await assertNoOverlap({
      jobId,
      assignedUserIds: assignedToIds,
      scheduledStart: jobData.scheduledStart,
      scheduledEnd: jobData.scheduledEnd,
    });
    if (overlapError) return { error: overlapError };

    const removedIds = existingAssignedIds.filter((id) => !assignedToIds.includes(id));

    await db.$transaction([
      db.job.update({ where: { id: jobId }, data: jobData }),
      ...(removedIds.length > 0
        ? [db.jobAssignment.deleteMany({ where: { jobId, userId: { in: removedIds } } })]
        : []),
      ...newlyAssignedIds.map((userId) =>
        db.jobAssignment.create({ data: { jobId, userId } }),
      ),
    ]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.issues[0]?.message ?? "Invalid job details" };
    }
    return { error: "Could not update job" };
  }

  await logJobAudit("edited", jobId, user.id);

  if (newlyAssignedIds.length > 0) {
    const job = await db.job.findUnique({ where: { id: jobId } });
    if (job) {
      await Promise.all(
        newlyAssignedIds.map((userId) =>
          notifyUser(userId, {
            title: "New job assigned",
            body: job.title,
            url: `/jobs/${jobId}`,
          }),
        ),
      );
    }
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/schedule");
  revalidatePath("/");
}

export async function updateJobStatus(jobId: string, status: JobStatus) {
  const user = await requireUser();

  const existing = await db.job.findUnique({
    where: { id: jobId },
    include: { assignments: true },
  });
  if (!existing) throw new Error("Job not found");
  const assignedUserIds = existing.assignments.map((a) => a.userId);

  if (user.role === "TECH" && !assignedUserIds.includes(user.id)) {
    throw new Error("Not authorized");
  }

  if (user.role === "TECH" && status === "CANCELLED") {
    throw new Error("Only an admin or dispatcher can cancel a job");
  }

  const stateError = assertValidJobState({
    status,
    assignedUserIds,
    scheduledStart: existing.scheduledStart,
  });
  if (stateError) throw new Error(stateError);

  await db.job.update({ where: { id: jobId }, data: { status } });

  await logJobAudit("status_changed", jobId, user.id, {
    from: existing.status,
    to: status,
  });

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/schedule");
  revalidatePath("/");
}

export async function assignTechToJob(jobId: string, userId: string) {
  const user = await requireRole("ADMIN", "DISPATCHER");

  const assignableError = await assertAssignableTechs([userId]);
  if (assignableError) throw new Error(assignableError);

  const existing = await db.job.findUnique({
    where: { id: jobId },
    include: { assignments: true },
  });
  if (!existing) throw new Error("Job not found");
  if (existing.assignments.some((a) => a.userId === userId)) return;

  const overlapError = await assertNoOverlap({
    jobId,
    assignedUserIds: [userId],
    scheduledStart: existing.scheduledStart,
    scheduledEnd: existing.scheduledEnd,
  });
  if (overlapError) throw new Error(overlapError);

  // Promote UNSCHEDULED -> SCHEDULED when there's already a time set.
  let nextStatus = existing.status;
  if (existing.scheduledStart && existing.status === "UNSCHEDULED") {
    nextStatus = "SCHEDULED";
  }

  await db.$transaction([
    db.jobAssignment.create({ data: { jobId, userId } }),
    db.job.update({ where: { id: jobId }, data: { status: nextStatus } }),
  ]);

  await logJobAudit("assigned", jobId, user.id, { userId });

  await notifyUser(userId, {
    title: "New job assigned",
    body: existing.title,
    url: `/jobs/${jobId}`,
  });

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/schedule");
  revalidatePath("/");
}

export async function unassignTechFromJob(jobId: string, userId: string) {
  const user = await requireRole("ADMIN", "DISPATCHER");

  const existing = await db.job.findUnique({
    where: { id: jobId },
    include: { assignments: true },
  });
  if (!existing) throw new Error("Job not found");

  const remainingCount = existing.assignments.filter((a) => a.userId !== userId).length;

  // A job in progress or completed still needs at least one tech (see
  // assertValidJobState) — step it back down to whatever its time alone
  // supports if this was the last one assigned.
  let nextStatus = existing.status;
  if (
    remainingCount === 0 &&
    (existing.status === "IN_PROGRESS" || existing.status === "COMPLETED")
  ) {
    nextStatus = existing.scheduledStart ? "SCHEDULED" : "UNSCHEDULED";
  }

  await db.$transaction([
    db.jobAssignment.deleteMany({ where: { jobId, userId } }),
    db.job.update({ where: { id: jobId }, data: { status: nextStatus } }),
  ]);

  await logJobAudit("unassigned", jobId, user.id, { userId });

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/schedule");
  revalidatePath("/");
}

export async function deleteJob(jobId: string) {
  const user = await requireRole("ADMIN", "DISPATCHER");
  await logJobAudit("deleted", jobId, user.id);
  await db.job.delete({ where: { id: jobId } });
  revalidatePath("/jobs");
  revalidatePath("/schedule");
  redirect("/jobs");
}
