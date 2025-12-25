-- CreateEnum
CREATE TYPE "IndexingStatus" AS ENUM ('IDLE', 'DOWNLOADING', 'DOWNLOADED', 'INDEXING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Repository" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "indexingStatus" "IndexingStatus" NOT NULL DEFAULT 'IDLE',
ADD COLUMN     "lastIndexedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Repository_indexingStatus_idx" ON "Repository"("indexingStatus");
