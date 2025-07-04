/*
  Warnings:

  - You are about to drop the `rankings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `clubId` on the `athletes` table. All the data in the column will be lost.
  - Added the required column `organizationId` to the `clubs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `events` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "rankings_eventId_athleteId_phase_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "rankings";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "organization_translations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    CONSTRAINT "organization_translations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "athlete_organizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "athleteId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "membershipType" TEXT NOT NULL DEFAULT 'MEMBER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "athlete_organizations_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "athlete_organizations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "global_rankings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "athleteId" TEXT NOT NULL,
    "weapon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rank" INTEGER,
    "points" INTEGER NOT NULL DEFAULT 0,
    "victories" INTEGER NOT NULL DEFAULT 0,
    "matches" INTEGER NOT NULL DEFAULT 0,
    "touchesScored" INTEGER NOT NULL DEFAULT 0,
    "touchesReceived" INTEGER NOT NULL DEFAULT 0,
    "indicator" INTEGER NOT NULL DEFAULT 0,
    "season" TEXT NOT NULL,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "global_rankings_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "organization_rankings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "eventId" TEXT,
    "phase" TEXT NOT NULL,
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
    CONSTRAINT "organization_rankings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_athletes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" DATETIME,
    "nationality" TEXT,
    "fieId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_athletes" ("createdAt", "dateOfBirth", "fieId", "firstName", "id", "isActive", "lastName", "nationality", "updatedAt") SELECT "createdAt", "dateOfBirth", "fieId", "firstName", "id", "isActive", "lastName", "nationality", "updatedAt" FROM "athletes";
DROP TABLE "athletes";
ALTER TABLE "new_athletes" RENAME TO "athletes";
CREATE UNIQUE INDEX "athletes_fieId_key" ON "athletes"("fieId");
CREATE TABLE "new_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "eventId" TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_audit_logs" ("action", "eventId", "id", "newValues", "oldValues", "recordId", "tableName", "timestamp", "userId") SELECT "action", "eventId", "id", "newValues", "oldValues", "recordId", "tableName", "timestamp", "userId" FROM "audit_logs";
DROP TABLE "audit_logs";
ALTER TABLE "new_audit_logs" RENAME TO "audit_logs";
CREATE INDEX "audit_logs_organizationId_idx" ON "audit_logs"("organizationId");
CREATE INDEX "audit_logs_eventId_idx" ON "audit_logs"("eventId");
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE TABLE "new_clubs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "clubs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_clubs" ("city", "country", "createdAt", "id", "name", "updatedAt") SELECT "city", "country", "createdAt", "id", "name", "updatedAt" FROM "clubs";
DROP TABLE "clubs";
ALTER TABLE "new_clubs" RENAME TO "clubs";
CREATE INDEX "clubs_organizationId_idx" ON "clubs"("organizationId");
CREATE TABLE "new_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weapon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "venue" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "maxParticipants" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_events" ("category", "createdAt", "createdById", "description", "endDate", "id", "maxParticipants", "name", "startDate", "status", "updatedAt", "venue", "weapon") SELECT "category", "createdAt", "createdById", "description", "endDate", "id", "maxParticipants", "name", "startDate", "status", "updatedAt", "venue", "weapon" FROM "events";
DROP TABLE "events";
ALTER TABLE "new_events" RENAME TO "events";
CREATE INDEX "events_organizationId_idx" ON "events"("organizationId");
CREATE INDEX "events_organizationId_status_idx" ON "events"("organizationId", "status");
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'PUBLIC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "organizationId" TEXT,
    CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_users" ("createdAt", "email", "id", "name", "role", "updatedAt") SELECT "createdAt", "email", "id", "name", "role", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "organization_translations_organizationId_locale_key" ON "organization_translations"("organizationId", "locale");

-- CreateIndex
CREATE INDEX "athlete_organizations_organizationId_idx" ON "athlete_organizations"("organizationId");

-- CreateIndex
CREATE INDEX "athlete_organizations_athleteId_idx" ON "athlete_organizations"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_organizations_athleteId_organizationId_key" ON "athlete_organizations"("athleteId", "organizationId");

-- CreateIndex
CREATE INDEX "global_rankings_weapon_category_season_idx" ON "global_rankings"("weapon", "category", "season");

-- CreateIndex
CREATE UNIQUE INDEX "global_rankings_athleteId_weapon_category_season_key" ON "global_rankings"("athleteId", "weapon", "category", "season");

-- CreateIndex
CREATE INDEX "organization_rankings_organizationId_idx" ON "organization_rankings"("organizationId");

-- CreateIndex
CREATE INDEX "organization_rankings_eventId_idx" ON "organization_rankings"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_rankings_organizationId_athleteId_eventId_phase_key" ON "organization_rankings"("organizationId", "athleteId", "eventId", "phase");

-- CreateIndex
CREATE INDEX "cards_athleteId_idx" ON "cards"("athleteId");

-- CreateIndex
CREATE INDEX "de_brackets_eventId_idx" ON "de_brackets"("eventId");

-- CreateIndex
CREATE INDEX "de_matches_bracketId_idx" ON "de_matches"("bracketId");

-- CreateIndex
CREATE INDEX "event_registrations_eventId_idx" ON "event_registrations"("eventId");

-- CreateIndex
CREATE INDEX "event_registrations_athleteId_idx" ON "event_registrations"("athleteId");

-- CreateIndex
CREATE INDEX "poule_assignments_pouleId_idx" ON "poule_assignments"("pouleId");

-- CreateIndex
CREATE INDEX "poule_assignments_athleteId_idx" ON "poule_assignments"("athleteId");

-- CreateIndex
CREATE INDEX "poule_matches_pouleId_idx" ON "poule_matches"("pouleId");

-- CreateIndex
CREATE INDEX "poules_eventId_idx" ON "poules"("eventId");
