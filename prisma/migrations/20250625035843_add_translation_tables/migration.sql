-- CreateTable
CREATE TABLE "de_bracket_translations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bracketId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "de_bracket_translations_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "de_brackets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_log_translations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actionKey" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "description" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "de_bracket_translations_bracketId_locale_key" ON "de_bracket_translations"("bracketId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "audit_log_translations_actionKey_locale_key" ON "audit_log_translations"("actionKey", "locale");
