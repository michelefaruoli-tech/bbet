import { prisma } from "./prisma";
import { toNumber } from "./format";
import {
  buildFinancialStatement,
  calcLayBalance,
  calcMasterBalance,
} from "./calculations";
import { openSuspendedTotals } from "./sospesi-period";

export async function getSuspendedSummary() {
  const [customers, tris] = await Promise.all([
    prisma.customer.findMany({
      where: { deletedAt: null, active: true, systemKey: null },
      include: {
        movements: { where: { deletedAt: null } },
      },
    }),
    getTrisAccount(),
  ]);

  let positiveCredits = 0;
  let negativeBalances = 0;
  let clientsNet = 0;

  const customerSummaries = customers.map((c) => {
    const { openMovements: _open, ...totals } = openSuspendedTotals(c.currentPeriod, c.movements);
    if (totals.balance > 0) positiveCredits += totals.balance;
    if (totals.balance < 0) negativeBalances += totals.balance;
    clientsNet += totals.balance;
    const last = c.movements.reduce<Date | null>(
      (acc, m) => (!acc || m.createdAt > acc ? m.createdAt : acc),
      null,
    );
    return { customer: c, ...totals, lastMovementAt: last };
  });

  const round2 = (n: number) => Math.round(n * 100) / 100;
  return {
    positiveCredits,
    negativeBalances,
    /** Solo clienti (senza conto Tris) */
    clientsNet: round2(clientsNet),
    /** Saldo conto Tris: positivo = il Tris ti deve, negativo = gli devi */
    trisBalance: tris.balance,
    /** Saldo sospesi totale = clienti + conto Tris (è quello che entra nel rendiconto) */
    netTotal: round2(clientsNet + tris.balance),
    customerSummaries,
    tris,
  };
}

/**
 * Conto fisso Tris nei Sospesi.
 * Saldo = movimenti di denaro (Dare − Avere, come un cliente) + giocate (Avere − Dare).
 * Niente periodi: si sommano tutti i movimenti.
 */
export async function getTrisAccount() {
  const account = await prisma.customer.findUnique({ where: { systemKey: "TRIS" } });
  const [moves, plays] = await Promise.all([
    account
      ? prisma.suspendedMovement.findMany({
          where: { customerId: account.id, deletedAt: null },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          include: { createdBy: { select: { name: true } } },
        })
      : Promise.resolve([]),
    prisma.trisPlay.findMany({
      where: { deletedAt: null },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { createdBy: { select: { name: true } } },
    }),
  ]);

  let moneyBalance = 0;
  for (const m of moves) moneyBalance += m.movementType === "DARE" ? toNumber(m.amount) : -toNumber(m.amount);
  let playsBalance = 0;
  for (const p of plays) playsBalance += p.playType === "AVERE" ? toNumber(p.amount) : -toNumber(p.amount);
  const balance = Math.round((moneyBalance + playsBalance) * 100) / 100;

  return { account, moves, plays, moneyBalance, playsBalance, balance };
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
  const [movements, closures] = await Promise.all([
    prisma.layMovement.findMany({
      where: { deletedAt: null },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { createdBy: { select: { name: true } } },
    }),
    prisma.layMonthlyClosure.findMany({
      orderBy: [{ year: "asc" }, { month: "asc" }],
    }),
  ]);

  const closedKeys = new Set(closures.map((c) => yearMonthKey(c.year, c.month)));

  // Movimenti dei mesi NON ancora chiusi (evita doppio conteggio con le chiusure)
  const openMovements = movements.filter((m) => {
    const d = new Date(m.date);
    return !closedKeys.has(yearMonthKey(d.getUTCFullYear(), d.getUTCMonth() + 1));
  });

  const openBalance = calcLayBalance(openMovements);
  // Saldo cassa LAY = ultimo cumulativo chiuso + movimenti dei mesi aperti
  const lastClosure = closures.length > 0 ? closures[closures.length - 1] : null;
  const closedCash = lastClosure ? toNumber(lastClosure.cumulativeBalance) : 0;
  const cumulativeBalance = Math.round((closedCash + openBalance) * 100) / 100;

  return {
    currentBalance: openBalance,
    cumulativeBalance,
    openMovements,
    movementCount: movements.length,
    movements,
    closures,
  };
}

/**
 * Conto fisso Posta: specchio della cassa LAY.
 * Saldo (come un cliente) = − saldo LAY. Positivo = Posta deve mettere soldi.
 */
export async function getPostaAccount(lay?: Awaited<ReturnType<typeof getLaySummary>>) {
  const [account, laySummary] = await Promise.all([
    prisma.customer.findUnique({ where: { systemKey: "POSTA" } }),
    lay ? Promise.resolve(lay) : getLaySummary(),
  ]);
  const moves = laySummary.movements.filter((m) => m.category === "POSTA");
  const balance = Math.round(-laySummary.cumulativeBalance * 100) / 100;
  return { account, moves, balance, layBalance: laySummary.cumulativeBalance };
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
    tris: suspended.trisBalance,
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
