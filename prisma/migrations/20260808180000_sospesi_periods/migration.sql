-- AlterTable
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "currentPeriod" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "SuspendedMovement" ADD COLUMN IF NOT EXISTS "period" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SuspendedMovement_customerId_period_idx" ON "SuspendedMovement"("customerId", "period");
