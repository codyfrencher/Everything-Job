-- AlterTable
ALTER TABLE "Job" DROP COLUMN "estimatedSqft",
DROP COLUMN "estimatedRooms";

-- AlterTable
ALTER TABLE "Material" DROP COLUMN "unit",
DROP COLUMN "calcType",
DROP COLUMN "rate",
DROP COLUMN "unitCost",
ADD COLUMN     "keywords" TEXT;

-- DropEnum
DROP TYPE "MaterialCalcType";

-- CreateTable
CREATE TABLE "JobSupply" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,

    CONSTRAINT "JobSupply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobSupply_jobId_idx" ON "JobSupply"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "JobSupply_jobId_materialId_key" ON "JobSupply"("jobId", "materialId");

-- AddForeignKey
ALTER TABLE "JobSupply" ADD CONSTRAINT "JobSupply_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSupply" ADD CONSTRAINT "JobSupply_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
