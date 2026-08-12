-- CreateTable
CREATE TABLE "JobPhoto" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobId" TEXT NOT NULL,
    "uploadedById" TEXT,

    CONSTRAINT "JobPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobPhoto_jobId_idx" ON "JobPhoto"("jobId");

-- AddForeignKey
ALTER TABLE "JobPhoto" ADD CONSTRAINT "JobPhoto_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPhoto" ADD CONSTRAINT "JobPhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
