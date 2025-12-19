-- AlterTable
ALTER TABLE "InstallationOwner" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "uninstalledAt" TIMESTAMP(3);
