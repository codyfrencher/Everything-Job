-- AlterTable
ALTER TABLE "Job" ADD COLUMN "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Job_externalId_key" ON "Job"("externalId");
