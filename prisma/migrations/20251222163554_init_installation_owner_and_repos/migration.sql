/*
  Warnings:

  - A unique constraint covering the columns `[githubLogin]` on the table `InstallationOwner` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "InstallationOwner_githubLogin_key" ON "InstallationOwner"("githubLogin");
