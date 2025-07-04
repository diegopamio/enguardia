/*
  Warnings:

  - You are about to drop the column `club` on the `athletes` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `athletes` table. All the data in the column will be lost.
  - You are about to drop the column `eventId` on the `athletes` table. All the data in the column will be lost.
  - You are about to drop the column `isPresent` on the `athletes` table. All the data in the column will be lost.
  - You are about to drop the column `licenseNum` on the `athletes` table. All the data in the column will be lost.
  - You are about to drop the column `seedNumber` on the `athletes` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `isLocked` on the `poules` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `athletes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `poules` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "clubs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "club_translations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "club_translations_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "athlete_weapons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "athleteId" TEXT NOT NULL,
    "weapon" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "athlete_weapons_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event_translations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    CONSTRAINT "event_translations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event_registrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "seedNumber" INTEGER,
    "isPresent" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_registrations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_registrations_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "poule_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pouleId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "poule_assignments_pouleId_fkey" FOREIGN KEY ("pouleId") REFERENCES "poules" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "poule_assignments_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "poule_matches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pouleId" TEXT NOT NULL,
    "athleteAId" TEXT NOT NULL,
    "athleteBId" TEXT NOT NULL,
    "scoreA" INTEGER NOT NULL DEFAULT 0,
    "scoreB" INTEGER NOT NULL DEFAULT 0,
    "winnerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "startTime" DATETIME,
    "endTime" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "poule_matches_pouleId_fkey" FOREIGN KEY ("pouleId") REFERENCES "poules" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "poule_matches_athleteAId_fkey" FOREIGN KEY ("athleteAId") REFERENCES "athletes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "poule_matches_athleteBId_fkey" FOREIGN KEY ("athleteBId") REFERENCES "athletes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "poule_matches_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "athletes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "de_brackets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "de_brackets_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "de_matches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bracketId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "athleteAId" TEXT,
    "athleteBId" TEXT,
    "scoreA" INTEGER NOT NULL DEFAULT 0,
    "scoreB" INTEGER NOT NULL DEFAULT 0,
    "winnerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "piste" TEXT,
    "referee" TEXT,
    "startTime" DATETIME,
    "endTime" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "de_matches_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "de_brackets" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "de_matches_athleteAId_fkey" FOREIGN KEY ("athleteAId") REFERENCES "athletes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "de_matches_athleteBId_fkey" FOREIGN KEY ("athleteBId") REFERENCES "athletes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "de_matches_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "athletes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "athleteId" TEXT NOT NULL,
    "cardType" TEXT NOT NULL,
    "reason" TEXT,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pouleMatchId" TEXT,
    "deMatchId" TEXT,
    CONSTRAINT "cards_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "cards_pouleMatchId_fkey" FOREIGN KEY ("pouleMatchId") REFERENCES "poule_matches" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "cards_deMatchId_fkey" FOREIGN KEY ("deMatchId") REFERENCES "de_matches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rankings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "rankings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rankings_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "updatedAt" DATETIME NOT NULL,
    "clubId" TEXT,
    CONSTRAINT "athletes_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_athletes" ("firstName", "id", "lastName") SELECT "firstName", "id", "lastName" FROM "athletes";
DROP TABLE "athletes";
ALTER TABLE "new_athletes" RENAME TO "athletes";
CREATE UNIQUE INDEX "athletes_fieId_key" ON "athletes"("fieId");
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_events" ("category", "createdAt", "createdById", "description", "endDate", "id", "name", "startDate", "updatedAt", "weapon") SELECT "category", "createdAt", "createdById", "description", "endDate", "id", "name", "startDate", "updatedAt", "weapon" FROM "events";
DROP TABLE "events";
ALTER TABLE "new_events" RENAME TO "events";
CREATE TABLE "new_poules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "piste" TEXT,
    "referee" TEXT,
    "startTime" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "poules_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_poules" ("createdAt", "eventId", "id", "number", "piste", "referee", "startTime") SELECT "createdAt", "eventId", "id", "number", "piste", "referee", "startTime" FROM "poules";
DROP TABLE "poules";
ALTER TABLE "new_poules" RENAME TO "poules";
CREATE UNIQUE INDEX "poules_eventId_number_key" ON "poules"("eventId", "number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "club_translations_clubId_locale_key" ON "club_translations"("clubId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_weapons_athleteId_weapon_key" ON "athlete_weapons"("athleteId", "weapon");

-- CreateIndex
CREATE UNIQUE INDEX "event_translations_eventId_locale_key" ON "event_translations"("eventId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "event_registrations_eventId_athleteId_key" ON "event_registrations"("eventId", "athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "poule_assignments_pouleId_athleteId_key" ON "poule_assignments"("pouleId", "athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "poule_assignments_pouleId_position_key" ON "poule_assignments"("pouleId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "poule_matches_pouleId_athleteAId_athleteBId_key" ON "poule_matches"("pouleId", "athleteAId", "athleteBId");

-- CreateIndex
CREATE UNIQUE INDEX "de_brackets_eventId_round_key" ON "de_brackets"("eventId", "round");

-- CreateIndex
CREATE UNIQUE INDEX "de_matches_bracketId_position_key" ON "de_matches"("bracketId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "rankings_eventId_athleteId_phase_key" ON "rankings"("eventId", "athleteId", "phase");
