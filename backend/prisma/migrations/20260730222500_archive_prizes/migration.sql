ALTER TABLE "Prize" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Prize_deletedAt_idx" ON "Prize"("deletedAt");
