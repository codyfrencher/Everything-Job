-- CreateTable
CREATE TABLE "JobAssignment" (
    "id" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "JobAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobAssignment_userId_idx" ON "JobAssignment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JobAssignment_jobId_userId_key" ON "JobAssignment"("jobId", "userId");

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: carry every existing single assignment over as a JobAssignment row
INSERT INTO "JobAssignment" ("id", "jobId", "userId", "assignedAt")
SELECT gen_random_uuid()::text, "id", "assignedToId", now()
FROM "Job"
WHERE "assignedToId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_assignedToId_fkey";

-- DropIndex
DROP INDEX "Job_assignedToId_idx";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "assignedToId";
