-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table
-- Create new table with nullable scores
CREATE TABLE "new_poule_matches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pouleId" TEXT NOT NULL,
    "athleteAId" TEXT NOT NULL,
    "athleteBId" TEXT NOT NULL,
    "scoreA" INTEGER,
    "scoreB" INTEGER,
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

-- Copy data from old table
INSERT INTO "new_poule_matches" SELECT * FROM "poule_matches";

-- Drop old table
DROP TABLE "poule_matches";

-- Rename new table
ALTER TABLE "new_poule_matches" RENAME TO "poule_matches";

-- Recreate indexes
CREATE UNIQUE INDEX "poule_matches_pouleId_athleteAId_athleteBId_key" ON "poule_matches"("pouleId", "athleteAId", "athleteBId");
CREATE INDEX "poule_matches_pouleId_idx" ON "poule_matches"("pouleId"); 