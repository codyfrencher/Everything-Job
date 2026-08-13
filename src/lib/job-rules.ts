import { db } from "@/lib/db";
import type { JobStatus } from "@prisma/client";

export function assertValidTimeRange(
  start: Date | null,
  end: Date | null,
): string | null {
  if (start && end && end <= start) {
    return "Scheduled end must be after the scheduled start";
  }
  return null;
}

export function assertValidJobState(job: {
  status: JobStatus;
  assignedToId: string | null;
  scheduledStart: Date | null;
}): string | null {
  if (job.status === "SCHEDULED" && !job.scheduledStart) {
    return "A scheduled job needs a scheduled time";
  }
  if (
    (job.status === "IN_PROGRESS" || job.status === "COMPLETED") &&
    !job.assignedToId
  ) {
    return "A job can't be in progress or completed without an assigned tech";
  }
  return null;
}

export async function assertNoOverlap(params: {
  jobId?: string;
  assignedToId: string | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
}): Promise<string | null> {
  const { jobId, assignedToId, scheduledStart, scheduledEnd } = params;
  if (!assignedToId || !scheduledStart || !scheduledEnd) return null;

  const conflict = await db.job.findFirst({
    where: {
      assignedToId,
      ...(jobId ? { id: { not: jobId } } : {}),
      scheduledStart: { lt: scheduledEnd },
      scheduledEnd: { gt: scheduledStart },
    },
  });

  if (conflict) {
    return `Overlaps with "${conflict.title}", already scheduled for this tech at that time`;
  }
  return null;
}
