CREATE TYPE "DrawResultType" AS ENUM ('WIN', 'LOSS');

CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "normalizedPhone" TEXT NOT NULL,
    "gameConsent" BOOLEAN NOT NULL,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Prize" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "probability" DOUBLE PRECISION NOT NULL,
    "initialStock" INTEGER NOT NULL,
    "remainingStock" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Prize_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Prize_stock_check" CHECK ("initialStock" >= 0 AND "remainingStock" >= 0),
    CONSTRAINT "Prize_probability_check" CHECK ("probability" >= 0 AND "probability" <= 1)
);

CREATE TABLE "Draw" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "prizeId" TEXT,
    "resultType" "DrawResultType" NOT NULL,
    "isPrizeDelivered" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Draw_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GameSettings" (
    "id" TEXT NOT NULL,
    "gameName" TEXT NOT NULL DEFAULT 'Jeu promotionnel',
    "welcomeMessage" TEXT NOT NULL DEFAULT 'Bienvenue dans notre jeu promotionnel',
    "loseMessage" TEXT NOT NULL DEFAULT 'Dommage, cette fois-ci vous n''avez pas gagné',
    "participationPeriod" TEXT NOT NULL DEFAULT 'daily',
    "isGameActive" BOOLEAN NOT NULL DEFAULT false,
    "returnDelaySeconds" INTEGER NOT NULL DEFAULT 5,
    "privacyPolicyUrl" TEXT,
    "rulesUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GameSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");
CREATE INDEX "Participant_normalizedPhone_createdAt_idx" ON "Participant"("normalizedPhone", "createdAt");
CREATE INDEX "Prize_isActive_remainingStock_idx" ON "Prize"("isActive", "remainingStock");
CREATE INDEX "Draw_createdAt_idx" ON "Draw"("createdAt");
CREATE INDEX "Draw_resultType_idx" ON "Draw"("resultType");

ALTER TABLE "Draw"
  ADD CONSTRAINT "Draw_participantId_fkey"
  FOREIGN KEY ("participantId") REFERENCES "Participant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Draw"
  ADD CONSTRAINT "Draw_prizeId_fkey"
  FOREIGN KEY ("prizeId") REFERENCES "Prize"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
