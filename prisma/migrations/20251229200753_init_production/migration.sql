-- CreateEnum
CREATE TYPE "RepositoryType" AS ENUM ('MAIN', 'DOCS', 'IGNORE');

-- CreateEnum
CREATE TYPE "IndexingStatus" AS ENUM ('IDLE', 'DOWNLOADING', 'DOWNLOADED', 'INDEXING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "InstallationOwner" (
    "id" TEXT NOT NULL,
    "githubInstallationId" INTEGER NOT NULL,
    "githubLogin" TEXT NOT NULL,
    "githubAccountType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "uninstalledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstallationOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RepositoryType" NOT NULL DEFAULT 'MAIN',
    "indexingStatus" "IndexingStatus" NOT NULL DEFAULT 'IDLE',
    "lastIndexedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "installationOwnerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstallationOwner_githubInstallationId_key" ON "InstallationOwner"("githubInstallationId");

-- CreateIndex
CREATE UNIQUE INDEX "InstallationOwner_githubLogin_key" ON "InstallationOwner"("githubLogin");

-- CreateIndex
CREATE INDEX "Repository_type_idx" ON "Repository"("type");

-- CreateIndex
CREATE INDEX "Repository_indexingStatus_idx" ON "Repository"("indexingStatus");

-- AddForeignKey
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_installationOwnerId_fkey" FOREIGN KEY ("installationOwnerId") REFERENCES "InstallationOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
