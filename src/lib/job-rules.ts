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
  assignedUserIds: string[];
  scheduledStart: Date | null;
}): string | null {
  if (job.status === "SCHEDULED" && !job.scheduledStart) {
    return "A scheduled job needs a scheduled time";
  }
  if (
    (job.status === "IN_PROGRESS" || job.status === "COMPLETED") &&
    job.assignedUserIds.length === 0
  ) {
    return "A job can't be in progress or completed without an assigned tech";
  }
  return null;
}

export async function assertNoOverlap(params: {
  jobId?: string;
  assignedUserIds: string[];
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
}): Promise<string | null> {
  const { jobId, assignedUserIds, scheduledStart, scheduledEnd } = params;
  if (assignedUserIds.length === 0 || !scheduledStart || !scheduledEnd) return null;

  const conflict = await db.jobAssignment.findFirst({
    where: {
      userId: { in: assignedUserIds },
      ...(jobId ? { jobId: { not: jobId } } : {}),
      job: {
        scheduledStart: { lt: scheduledEnd },
        scheduledEnd: { gt: scheduledStart },
      },
    },
    include: { job: { select: { title: true } }, user: { select: { name: true } } },
  });

  if (conflict) {
    return `Overlaps with "${conflict.job.title}", already scheduled for ${conflict.user.name} at that time`;
  }
  return null;
}
