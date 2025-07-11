/*
  Warnings:

  - You are about to drop the column `organizationId` on the `clubs` table. All the data in the column will be lost.
  - Made the column `country` on table `clubs` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateTable
CREATE TABLE "club_organizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "affiliationType" TEXT NOT NULL DEFAULT 'MEMBER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "club_organizations_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "club_organizations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_clubs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    CONSTRAINT "clubs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_clubs" ("city", "country", "createdAt", "id", "name", "updatedAt") SELECT "city", "country", "createdAt", "id", "name", "updatedAt" FROM "clubs";
DROP TABLE "clubs";
ALTER TABLE "new_clubs" RENAME TO "clubs";
CREATE INDEX "clubs_country_idx" ON "clubs"("country");
CREATE INDEX "clubs_name_idx" ON "clubs"("name");
CREATE UNIQUE INDEX "clubs_name_city_country_key" ON "clubs"("name", "city", "country");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "club_organizations_organizationId_idx" ON "club_organizations"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "club_organizations_clubId_organizationId_key" ON "club_organizations"("clubId", "organizationId");
