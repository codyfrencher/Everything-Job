-- AlterTable
ALTER TABLE "JobPhoto" ADD COLUMN     "uploadKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "JobPhoto_jobId_uploadKey_key" ON "JobPhoto"("jobId", "uploadKey");
