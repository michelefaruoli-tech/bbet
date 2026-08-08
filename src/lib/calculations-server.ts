import { prisma } from "./prisma";
import { toNumber } from "./format";
import {
  buildFinancialStatement,
  calcCustomerBalance,
  calcLayBalance,
  calcMasterBalance,
  calcTrisFromMovements,
  applyTrisDebt,
} from "./calculations";

export async function getSuspendedSummary() {
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null, active: true },
    include: {
      movements: { where: { deletedAt: null } },
    },
  });

  let positiveCredits = 0;
  let negativeBalances = 0;
  let netTotal = 0;

  const customerSummaries = customers.map((c) => {
    const totals = calcCustomerBalance(c.movements);
    if (totals.balance > 0) positiveCredits += totals.balance;
    if (totals.balance < 0) negativeBalances += totals.balance;
    netTotal += totals.balance;
    return { customer: c, ...totals };
  });

  return { positiveCredits, negativeBalances, netTotal, customerSummaries };
}

export async function getMasterSummary() {
  const movements = await prisma.masterMovement.findMany({
    where: { deletedAt: null },
    orderBy: { date: "desc" },
  });
  const balance = calcMasterBalance(movements);
  const positives = movements.filter((m) => toNumber(m.amount) > 0).reduce((s, m) => s + toNumber(m.amount), 0);
  const negatives = movements.filter((m) => toNumber(m.amount) < 0).reduce((s, m) => s + toNumber(m.amount), 0);
  return { balance, positives, negatives, movements };
}

function yearMonthKey(year: number, month: number) {
  return `${year}-${month}`;
}

export async function getLaySummary() {
  const movements = await prisma.layMovement.findMany({
    where: { deletedAt: null },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { createdBy: { select: { name: true } } },
  });
  const closures = await prisma.layMonthlyClosure.findMany({
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });
  const trisClosures = await prisma.trisMonthlyClosure.findMany({
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  const closedKeys = new Set(closures.map((c) => yearMonthKey(c.year, c.month)));
  const trisClosedKeys = new Set(trisClosures.map((c) => yearMonthKey(c.year, c.month)));

  // Movimenti dei mesi NON ancora chiusi (evita doppio conteggio con le chiusure)
  const openMovements = movements.filter((m) => {
    const d = new Date(m.date);
    return !closedKeys.has(yearMonthKey(d.getUTCFullYear(), d.getUTCMonth() + 1));
  });

  const openBalance = calcLayBalance(openMovements);
  // Saldo cassa LAY = ultimo cumulativo chiuso + movimenti del mese aperto
  const lastClosure = closures.length > 0 ? closures[closures.length - 1] : null;
  const closedCash = lastClosure ? toNumber(lastClosure.cumulativeBalance) : 0;
  const cumulativeBalance = closedCash + openBalance;

  // Tris: debito. Avere (+) lo riduce, Dare (−) lo aumenta.
  const openTrisMovements = movements.filter((m) => {
    if (m.category !== "TRIS") return false;
    const d = new Date(m.date);
    return !trisClosedKeys.has(yearMonthKey(d.getUTCFullYear(), d.getUTCMonth() + 1));
  });
  const trisOpen = calcTrisFromMovements(openTrisMovements);
  const lastTris = trisClosures.length > 0 ? trisClosures[trisClosures.length - 1] : null;
  const trisFromArchive = lastTris ? toNumber(lastTris.cumulativeBalance) : 0;
  const trisCumulative = applyTrisDebt(trisFromArchive, trisOpen.balance);

  // Contatori mese calendario corrente (si azzerano ogni mese)
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth() + 1;
  const monthTrisMovements = movements.filter((m) => {
    if (m.category !== "TRIS") return false;
    const d = new Date(m.date);
    return d.getUTCFullYear() === curY && d.getUTCMonth() + 1 === curM;
  });
  const trisMonth = calcTrisFromMovements(monthTrisMovements);

  const positives =
    closures.reduce((s, c) => s + toNumber(c.positiveTotal), 0) +
    openMovements.filter((m) => toNumber(m.amount) > 0).reduce((s, m) => s + toNumber(m.amount), 0);
  const negatives =
    closures.reduce((s, c) => s + toNumber(c.negativeTotal), 0) +
    openMovements.filter((m) => toNumber(m.amount) < 0).reduce((s, m) => s + Math.abs(toNumber(m.amount)), 0);

  return {
    currentBalance: openBalance,
    cumulativeBalance,
    positives,
    negatives,
    movementCount: movements.length,
    trisCumulative,
    trisCurrent: trisOpen,
    trisMonthAvere: trisMonth.positive,
    trisMonthDare: trisMonth.negative,
    trisMonthBalance: trisMonth.balance,
    trisMonthYear: curY,
    trisMonthMonth: curM,
    trisClosures,
    movements,
    closures,
  };
}

export async function getCashFundCurrent(): Promise<number> {
  const last = await prisma.cashFundMovement.findFirst({ orderBy: { date: "desc" } });
  if (last) return toNumber(last.closingValue);

  // Usa l'anno con Commissioni/Fondo reali (non solo Prelievi)
  const year = await getLatestCommissionYear();
  const months = await prisma.commissionMonth.findMany({ where: { year } });
  if (months.length === 0) return 0;

  const raw = months.reduce(
    (s, m) =>
      s +
      toNumber(m.invoiceAmount) +
      toNumber(m.bonusAmount) +
      toNumber(m.cashFund) -
      toNumber(m.withdrawals),
    0,
  );
  return Math.round((raw + Number.EPSILON) * 100) / 100;
}

export async function getWithdrawalsYearTotal(year: number): Promise<number> {
  const rows = await prisma.withdrawal.findMany({
    where: { year, deletedAt: null },
  });
  return rows.reduce((s, r) => s + toNumber(r.amount), 0);
}

export async function getCommissionYearTotal(year: number) {
  const months = await prisma.commissionMonth.findMany({ where: { year } });
  const invoice = months.reduce((s, m) => s + toNumber(m.invoiceAmount), 0);
  const bonus = months.reduce((s, m) => s + toNumber(m.bonusAmount), 0);
  const cashFund = months.reduce((s, m) => s + toNumber(m.cashFund), 0);
  const withdrawals = months.reduce((s, m) => s + toNumber(m.withdrawals), 0);
  const final = months.reduce((s, m) => s + toNumber(m.finalTotal), 0);
  const commissioniAnnuali = Math.round((invoice + bonus + Number.EPSILON) * 100) / 100;
  const totale =
    Math.round((commissioniAnnuali + cashFund - withdrawals + Number.EPSILON) * 100) / 100;
  return {
    year,
    invoice,
    bonus,
    /** Fatture + Bonus = totale commissioni annuale */
    commissioniAnnuali,
    /** Fondo cassa fisso (chiusura anno precedente) */
    cashFund,
    withdrawals,
    final,
    /** Commissioni + Fondo − Prelievi */
    totale,
  };
}

/**
 * Anno Commissioni da usare in Dashboard / KPI.
 * Preferisce anni con Fatture o Bonus (dati Commissioni reali).
 * Non sceglie un anno che ha solo Prelievi (es. 2026 con −2000).
 */
export async function getLatestCommissionYear(): Promise<number> {
  const rows = await prisma.commissionMonth.findMany({
    where: {
      OR: [
        { invoiceAmount: { not: 0 } },
        { bonusAmount: { not: 0 } },
        { cashFund: { not: 0 } },
      ],
    },
    select: { year: true, invoiceAmount: true, bonusAmount: true },
    orderBy: { year: "desc" },
  });

  const withInvoices = [
    ...new Set(
      rows
        .filter((m) => toNumber(m.invoiceAmount) !== 0 || toNumber(m.bonusAmount) !== 0)
        .map((m) => m.year),
    ),
  ].sort((a, b) => b - a);

  if (withInvoices[0]) return withInvoices[0];

  const withFund = [...new Set(rows.map((m) => m.year))].sort((a, b) => b - a);
  return withFund[0] ?? new Date().getFullYear();
}

export async function getFullDashboard() {
  const [suspended, master, lay, cashFund, current] = await Promise.all([
    getSuspendedSummary(),
    getMasterSummary(),
    getLaySummary(),
    getCashFundCurrent(),
    prisma.financialStatementCurrent.findUnique({ where: { id: "current" } }),
  ]);

  const calendarYear = new Date().getFullYear();
  const commissionDataYear = await getLatestCommissionYear();
  const [withdrawalsYear, commissionYear] = await Promise.all([
    getWithdrawalsYearTotal(calendarYear),
    getCommissionYearTotal(commissionDataYear),
  ]);

  const manual = current ?? {
    online: 0,
    manualCreditAdjustment: 0,
    personalAccounts: 0,
    cash: 0,
    coins: 0,
    cashTotal: 0,
    notes: null,
    updatedAt: new Date(),
  };

  const statement = buildFinancialStatement({
    online: toNumber(manual.online),
    manualCreditAdjustment: toNumber(manual.manualCreditAdjustment),
    personalAccounts: toNumber(manual.personalAccounts),
    cash: toNumber(manual.cash),
    coins: toNumber(manual.coins),
    cashTotal: toNumber(manual.cashTotal),
    cashFund,
    suspendedCredit: suspended.netTotal,
    tris: lay.trisCumulative,
    masterBalance: master.balance,
    layBalance: lay.cumulativeBalance,
  });

  return {
    suspended,
    master,
    lay,
    cashFund,
    withdrawalsYear,
    commissionYear,
    statement,
    lastUpdate: manual.updatedAt,
  };
}
