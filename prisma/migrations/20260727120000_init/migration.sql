-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR');
CREATE TYPE "SuspendedMovementType" AS ENUM ('DARE', 'AVERE');
CREATE TYPE "MasterMovementType" AS ENUM ('RICARICA', 'PAGAMENTO', 'BONUS', 'RETTIFICA', 'ALTRO');
CREATE TYPE "LayCategory" AS ENUM ('GENERICO', 'TRIS', 'ALTRO');
CREATE TYPE "WithdrawalSource" AS ENUM ('COMMISSIONI', 'FONDO_CASSA', 'MASTER', 'LAY', 'CONTANTI', 'ALTRO');
CREATE TYPE "CashFundMovementType" AS ENUM ('INCREMENTO', 'RIDUZIONE', 'RETTIFICA', 'RIPORTO_ANNUALE');

-- CreateTable User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateTable Customer
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Customer_active_idx" ON "Customer"("active");
CREATE INDEX "Customer_deletedAt_idx" ON "Customer"("deletedAt");
CREATE INDEX "Customer_name_surname_idx" ON "Customer"("name", "surname");

-- CreateTable SuspendedMovement
CREATE TABLE "SuspendedMovement" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT,
    "movementType" "SuspendedMovementType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "SuspendedMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SuspendedMovement_customerId_date_idx" ON "SuspendedMovement"("customerId", "date");
CREATE INDEX "SuspendedMovement_deletedAt_idx" ON "SuspendedMovement"("deletedAt");

ALTER TABLE "SuspendedMovement" ADD CONSTRAINT "SuspendedMovement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SuspendedMovement" ADD CONSTRAINT "SuspendedMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable MasterMovement
CREATE TABLE "MasterMovement" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT,
    "movementType" "MasterMovementType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "MasterMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MasterMovement_date_idx" ON "MasterMovement"("date");
CREATE INDEX "MasterMovement_deletedAt_idx" ON "MasterMovement"("deletedAt");
ALTER TABLE "MasterMovement" ADD CONSTRAINT "MasterMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable CommissionMonth
CREATE TABLE "CommissionMonth" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "invoiceAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "bonusAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "casinoGross" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "casinoNet" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sportNet" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "withdrawals" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cashFund" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "partialTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "finalTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommissionMonth_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommissionMonth_year_month_key" ON "CommissionMonth"("year", "month");
CREATE INDEX "CommissionMonth_year_idx" ON "CommissionMonth"("year");

-- CreateTable CashFundMovement
CREATE TABLE "CashFundMovement" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "movementType" "CashFundMovementType" NOT NULL,
    "openingValue" DECIMAL(14,2) NOT NULL,
    "closingValue" DECIMAL(14,2) NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashFundMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CashFundMovement_date_idx" ON "CashFundMovement"("date");
ALTER TABLE "CashFundMovement" ADD CONSTRAINT "CashFundMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable Withdrawal
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "source" "WithdrawalSource" NOT NULL,
    "destination" TEXT,
    "linkedSection" TEXT,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "commissionMonthId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Withdrawal_year_month_idx" ON "Withdrawal"("year", "month");
CREATE INDEX "Withdrawal_deletedAt_idx" ON "Withdrawal"("deletedAt");
CREATE INDEX "Withdrawal_commissionMonthId_idx" ON "Withdrawal"("commissionMonthId");
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable LayMovement
CREATE TABLE "LayMovement" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "category" "LayCategory" NOT NULL DEFAULT 'GENERICO',
    "description" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "LayMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LayMovement_date_idx" ON "LayMovement"("date");
CREATE INDEX "LayMovement_category_idx" ON "LayMovement"("category");
CREATE INDEX "LayMovement_deletedAt_idx" ON "LayMovement"("deletedAt");
ALTER TABLE "LayMovement" ADD CONSTRAINT "LayMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable LayMonthlyClosure
CREATE TABLE "LayMonthlyClosure" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "positiveTotal" DECIMAL(14,2) NOT NULL,
    "negativeTotal" DECIMAL(14,2) NOT NULL,
    "monthlyBalance" DECIMAL(14,2) NOT NULL,
    "trisPositive" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "trisNegative" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "trisBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cumulativeBalance" DECIMAL(14,2) NOT NULL,
    "movementCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LayMonthlyClosure_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LayMonthlyClosure_year_month_key" ON "LayMonthlyClosure"("year", "month");
CREATE INDEX "LayMonthlyClosure_year_idx" ON "LayMonthlyClosure"("year");

-- CreateTable AnnualArchive
CREATE TABLE "AnnualArchive" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "openingCashFund" DECIMAL(14,2) NOT NULL,
    "closingCashFund" DECIMAL(14,2) NOT NULL,
    "suspendedBalance" DECIMAL(14,2) NOT NULL,
    "masterBalance" DECIMAL(14,2) NOT NULL,
    "layBalance" DECIMAL(14,2) NOT NULL,
    "commissionTotal" DECIMAL(14,2) NOT NULL,
    "withdrawalTotal" DECIMAL(14,2) NOT NULL,
    "finalBalance" DECIMAL(14,2) NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnnualArchive_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnnualArchive_year_key" ON "AnnualArchive"("year");

-- CreateTable FinancialStatementCurrent
CREATE TABLE "FinancialStatementCurrent" (
    "id" TEXT NOT NULL,
    "online" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "manualCreditAdjustment" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "personalAccounts" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cash" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "coins" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cashTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinancialStatementCurrent_pkey" PRIMARY KEY ("id")
);

-- CreateTable FinancialStatementSnapshot
CREATE TABLE "FinancialStatementSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "snapshotType" TEXT NOT NULL DEFAULT 'MANUAL',
    "online" DECIMAL(14,2) NOT NULL,
    "manualCreditAdjustment" DECIMAL(14,2) NOT NULL,
    "personalAccounts" DECIMAL(14,2) NOT NULL,
    "cash" DECIMAL(14,2) NOT NULL,
    "coins" DECIMAL(14,2) NOT NULL,
    "suspendedCredit" DECIMAL(14,2) NOT NULL,
    "tris" DECIMAL(14,2) NOT NULL,
    "master" DECIMAL(14,2) NOT NULL,
    "lay" DECIMAL(14,2) NOT NULL,
    "calculatedTotal" DECIMAL(14,2) NOT NULL,
    "cashTotal" DECIMAL(14,2) NOT NULL,
    "difference" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialStatementSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinancialStatementSnapshot_snapshotDate_idx" ON "FinancialStatementSnapshot"("snapshotDate");
ALTER TABLE "FinancialStatementSnapshot" ADD CONSTRAINT "FinancialStatementSnapshot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable AuditLog
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable AppSettings
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppSettings_key_key" ON "AppSettings"("key");
