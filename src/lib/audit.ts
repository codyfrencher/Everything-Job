import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function logJobAudit(
  action: string,
  jobId: string,
  actorId: string | null,
  metadata?: Prisma.InputJsonValue,
) {
  await db.auditLog.create({
    data: { action, jobId, actorId, metadata },
  });
}
