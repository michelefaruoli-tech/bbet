-- Tris separato dal LAY.
-- 1) Conto fisso "Tris" nei Sospesi (Customer.systemKey = 'TRIS')
-- 2) Tabella giocate Tris (TrisPlay)
-- 3) Saldo iniziale del conto Tris = debito Tris attuale, calcolato qui al momento
--    in cui la migrazione gira, con la stessa formula della versione vecchia:
--    debito = ultimo cumulativo chiuso (TrisMonthlyClosure) − (Avere − Dare) dei movimenti
--    LAY categoria TRIS nei mesi Tris non ancora chiusi.
--    Il debito entra nei Sospesi come Avere (saldo conto negativo = "gli devi").
--    I vecchi movimenti LAY categoria TRIS restano nello storico LAY: il saldo LAY non cambia.
--    Risultato: la quadratura dà lo stesso totale di prima.

-- CreateEnum
CREATE TYPE "TrisPlayType" AS ENUM ('DARE', 'AVERE');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "systemKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_systemKey_key" ON "Customer"("systemKey");

-- CreateTable
CREATE TABLE "TrisPlay" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT,
    "playType" "TrisPlayType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TrisPlay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrisPlay_date_idx" ON "TrisPlay"("date");

-- CreateIndex
CREATE INDEX "TrisPlay_deletedAt_idx" ON "TrisPlay"("deletedAt");

-- AddForeignKey
ALTER TABLE "TrisPlay" ADD CONSTRAINT "TrisPlay_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Conto fisso Tris
INSERT INTO "Customer" ("id", "name", "surname", "notes", "active", "currentPeriod", "systemKey", "createdAt", "updatedAt")
VALUES (
  'tris-conto-fisso', 'Tris', '',
  'Conto fisso: qui solo saldo e movimenti di denaro. Le giocate sono in Conti › Giocate Tris.',
  true, 1, 'TRIS', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- Saldo iniziale = debito Tris attuale
WITH last_closure AS (
  SELECT "cumulativeBalance" AS v
  FROM "TrisMonthlyClosure"
  ORDER BY "year" DESC, "month" DESC
  LIMIT 1
),
open_moves AS (
  SELECT COALESCE(SUM(l."amount"), 0) AS v
  FROM "LayMovement" l
  WHERE l."deletedAt" IS NULL
    AND l."category" = 'TRIS'
    AND NOT EXISTS (
      SELECT 1 FROM "TrisMonthlyClosure" k
      WHERE k."year" = EXTRACT(YEAR FROM l."date")
        AND k."month" = EXTRACT(MONTH FROM l."date")
    )
),
debt AS (
  SELECT COALESCE((SELECT v FROM last_closure), 0) - (SELECT v FROM open_moves) AS v
),
author AS (
  SELECT "id" FROM "User"
  ORDER BY ("role" = 'ADMIN') DESC, "active" DESC, "createdAt" ASC
  LIMIT 1
)
INSERT INTO "SuspendedMovement" ("id", "customerId", "date", "time", "movementType", "amount", "description", "notes", "period", "createdById", "createdAt", "updatedAt")
SELECT
  'tris-saldo-iniziale',
  'tris-conto-fisso',
  (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Rome')::date,
  NULL,
  CASE WHEN debt.v >= 0 THEN 'AVERE'::"SuspendedMovementType" ELSE 'DARE'::"SuspendedMovementType" END,
  ABS(debt.v),
  'Saldo iniziale conto Tris',
  'Debito Tris al passaggio alla nuova versione (dal vecchio Rendiconto Tris)',
  1,
  author."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM debt, author
WHERE debt.v <> 0;
