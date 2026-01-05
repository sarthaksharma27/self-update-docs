-- AlterEnum
ALTER TYPE "RepositoryType" ADD VALUE 'HYBRID';

-- AlterTable
ALTER TABLE "Repository" ALTER COLUMN "type" SET DEFAULT 'IGNORE';
