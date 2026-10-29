-- CreateEnum
CREATE TYPE "MaterialCalcType" AS ENUM ('PER_SQFT', 'PER_ROOM', 'FLAT');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "estimatedSqft" INTEGER,
ADD COLUMN     "estimatedRooms" INTEGER;

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "calcType" "MaterialCalcType" NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Material_archivedAt_idx" ON "Material"("archivedAt");
