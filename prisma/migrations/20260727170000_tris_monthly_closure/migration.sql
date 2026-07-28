-- CreateTable
CREATE TABLE "TrisMonthlyClosure" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "dareTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "avereTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "monthlyBalance" DECIMAL(14,2) NOT NULL,
    "cumulativeBalance" DECIMAL(14,2) NOT NULL,
    "movementCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrisMonthlyClosure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrisMonthlyClosure_year_idx" ON "TrisMonthlyClosure"("year");

-- CreateIndex
CREATE UNIQUE INDEX "TrisMonthlyClosure_year_month_key" ON "TrisMonthlyClosure"("year", "month");
