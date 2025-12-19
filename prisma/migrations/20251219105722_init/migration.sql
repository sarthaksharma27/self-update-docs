-- CreateTable
CREATE TABLE "InstallationOwner" (
    "id" TEXT NOT NULL,
    "githubInstallationId" INTEGER NOT NULL,
    "githubLogin" TEXT NOT NULL,
    "githubAccountType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstallationOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "installationOwnerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstallationOwner_githubInstallationId_key" ON "InstallationOwner"("githubInstallationId");

-- AddForeignKey
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_installationOwnerId_fkey" FOREIGN KEY ("installationOwnerId") REFERENCES "InstallationOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
