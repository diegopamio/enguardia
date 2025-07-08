-- CreateTable
CREATE TABLE "athlete_clubs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "athleteId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "membershipType" TEXT NOT NULL DEFAULT 'MEMBER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "athlete_clubs_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "athlete_clubs_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "athlete_clubs_clubId_idx" ON "athlete_clubs"("clubId");

-- CreateIndex
CREATE INDEX "athlete_clubs_athleteId_idx" ON "athlete_clubs"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_clubs_athleteId_clubId_key" ON "athlete_clubs"("athleteId", "clubId");
