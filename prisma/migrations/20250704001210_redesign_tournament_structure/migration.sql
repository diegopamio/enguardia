/*
  Warnings:

  - You are about to drop the `event_registrations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `event_translations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `eventId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `eventId` on the `de_brackets` table. All the data in the column will be lost.
  - You are about to drop the column `eventId` on the `organization_rankings` table. All the data in the column will be lost.
  - You are about to drop the column `phase` on the `organization_rankings` table. All the data in the column will be lost.
  - You are about to drop the column `eventId` on the `poules` table. All the data in the column will be lost.
  - Added the required column `phaseId` to the `de_brackets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phaseType` to the `organization_rankings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phaseId` to the `poules` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "event_registrations_athleteId_idx";

-- DropIndex
DROP INDEX "event_registrations_eventId_idx";

-- DropIndex
DROP INDEX "event_registrations_eventId_athleteId_key";

-- DropIndex
DROP INDEX "event_translations_eventId_locale_key";

-- DropIndex
DROP INDEX "events_organizationId_status_idx";

-- DropIndex
DROP INDEX "events_organizationId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "event_registrations";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "event_translations";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "events";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "venue" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "tournaments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tournaments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tournament_translations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    CONSTRAINT "tournament_translations_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "competitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weapon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "maxParticipants" INTEGER,
    "registrationDeadline" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "competitions_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "competition_translations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitionId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "competition_translations_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "competition_registrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitionId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "seedNumber" INTEGER,
    "isPresent" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "competition_registrations_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "competition_registrations_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "phases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phaseType" TEXT NOT NULL,
    "sequenceOrder" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "startTime" DATETIME,
    "endTime" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "phases_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "phase_translations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phaseId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "phase_translations_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "phases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "tournamentId" TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_audit_logs" ("action", "id", "newValues", "oldValues", "organizationId", "recordId", "tableName", "timestamp", "userId") SELECT "action", "id", "newValues", "oldValues", "organizationId", "recordId", "tableName", "timestamp", "userId" FROM "audit_logs";
DROP TABLE "audit_logs";
ALTER TABLE "new_audit_logs" RENAME TO "audit_logs";
CREATE INDEX "audit_logs_organizationId_idx" ON "audit_logs"("organizationId");
CREATE INDEX "audit_logs_tournamentId_idx" ON "audit_logs"("tournamentId");
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE TABLE "new_de_brackets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "de_brackets_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "phases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_de_brackets" ("createdAt", "id", "name", "round", "updatedAt") SELECT "createdAt", "id", "name", "round", "updatedAt" FROM "de_brackets";
DROP TABLE "de_brackets";
ALTER TABLE "new_de_brackets" RENAME TO "de_brackets";
CREATE INDEX "de_brackets_phaseId_idx" ON "de_brackets"("phaseId");
CREATE UNIQUE INDEX "de_brackets_phaseId_round_key" ON "de_brackets"("phaseId", "round");
CREATE TABLE "new_organization_rankings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "competitionId" TEXT,
    "phaseType" TEXT NOT NULL,
    "rank" INTEGER,
    "victories" INTEGER NOT NULL DEFAULT 0,
    "matches" INTEGER NOT NULL DEFAULT 0,
    "touchesScored" INTEGER NOT NULL DEFAULT 0,
    "touchesReceived" INTEGER NOT NULL DEFAULT 0,
    "indicator" INTEGER NOT NULL DEFAULT 0,
    "vmRatio" REAL,
    "isEliminated" BOOLEAN NOT NULL DEFAULT false,
    "finalRank" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organization_rankings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "organization_rankings_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "organization_rankings_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_organization_rankings" ("athleteId", "createdAt", "finalRank", "id", "indicator", "isEliminated", "matches", "organizationId", "rank", "touchesReceived", "touchesScored", "updatedAt", "victories", "vmRatio") SELECT "athleteId", "createdAt", "finalRank", "id", "indicator", "isEliminated", "matches", "organizationId", "rank", "touchesReceived", "touchesScored", "updatedAt", "victories", "vmRatio" FROM "organization_rankings";
DROP TABLE "organization_rankings";
ALTER TABLE "new_organization_rankings" RENAME TO "organization_rankings";
CREATE INDEX "organization_rankings_organizationId_idx" ON "organization_rankings"("organizationId");
CREATE INDEX "organization_rankings_competitionId_idx" ON "organization_rankings"("competitionId");
CREATE UNIQUE INDEX "organization_rankings_organizationId_athleteId_competitionId_phaseType_key" ON "organization_rankings"("organizationId", "athleteId", "competitionId", "phaseType");
CREATE TABLE "new_poules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phaseId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "piste" TEXT,
    "referee" TEXT,
    "startTime" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "poules_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "phases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_poules" ("createdAt", "id", "number", "piste", "referee", "startTime", "status", "updatedAt") SELECT "createdAt", "id", "number", "piste", "referee", "startTime", "status", "updatedAt" FROM "poules";
DROP TABLE "poules";
ALTER TABLE "new_poules" RENAME TO "poules";
CREATE INDEX "poules_phaseId_idx" ON "poules"("phaseId");
CREATE UNIQUE INDEX "poules_phaseId_number_key" ON "poules"("phaseId", "number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "tournaments_organizationId_idx" ON "tournaments"("organizationId");

-- CreateIndex
CREATE INDEX "tournaments_organizationId_status_idx" ON "tournaments"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_translations_tournamentId_locale_key" ON "tournament_translations"("tournamentId", "locale");

-- CreateIndex
CREATE INDEX "competitions_tournamentId_idx" ON "competitions"("tournamentId");

-- CreateIndex
CREATE INDEX "competitions_tournamentId_weapon_category_idx" ON "competitions"("tournamentId", "weapon", "category");

-- CreateIndex
CREATE UNIQUE INDEX "competition_translations_competitionId_locale_key" ON "competition_translations"("competitionId", "locale");

-- CreateIndex
CREATE INDEX "competition_registrations_competitionId_idx" ON "competition_registrations"("competitionId");

-- CreateIndex
CREATE INDEX "competition_registrations_athleteId_idx" ON "competition_registrations"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "competition_registrations_competitionId_athleteId_key" ON "competition_registrations"("competitionId", "athleteId");

-- CreateIndex
CREATE INDEX "phases_competitionId_idx" ON "phases"("competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "phases_competitionId_sequenceOrder_key" ON "phases"("competitionId", "sequenceOrder");

-- CreateIndex
CREATE UNIQUE INDEX "phase_translations_phaseId_locale_key" ON "phase_translations"("phaseId", "locale");
