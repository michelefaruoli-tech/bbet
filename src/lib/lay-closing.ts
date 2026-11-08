import { prisma } from "./prisma";
import { writeAuditLog } from "./audit";
import { addMonths, monthKey } from "./lay-month";

/**
 * Chiusure mensili LAY (e archivio mensile Tris).
 *
 * Regola nuova: i mesi si chiudono da soli il 1° del mese successivo.
 * Un mese riaperto a mano resta aperto finché qualcuno non lo richiude a mano
 * (si tiene traccia dei mesi riaperti in AppSettings, chiave REOPENED_KEY).
 */

const REOPENED_KEY = "lay.reopenedMonths";

function ymKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export async function getReopenedMonths(): Promise<Set<string>> {
  const row = await prisma.appSettings.findUnique({ where: { key: REOPENED_KEY } });
  if (!row) return new Set();
  try {
    const list = JSON.parse(row.value);
    return new Set(Array.isArray(list) ? list.map(String) : []);
  } catch {
    return new Set();
  }
}

async function saveReopenedMonths(set: Set<string>) {
  const value = JSON.stringify([...set].sort());
  await prisma.appSettings.upsert({
    where: { key: REOPENED_KEY },
    update: { value },
    create: { id: REOPENED_KEY, key: REOPENED_KEY, value },
  });
}

export async function markMonthReopened(year: number, month: number) {
  const set = await getReopenedMonths();
  set.add(ymKey(year, month));
  await saveReopenedMonths(set);
}

export async function unmarkMonthReopened(year: number, month: number) {
  const set = await getReopenedMonths();
  if (set.delete(ymKey(year, month))) await saveReopenedMonths(set);
}

function monthRange(year: number, month: number) {
  // Le date sono salvate come DATE (mezzanotte UTC)
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { start, end };
}

/** Saldo del conto Tris nei Sospesi a fine giornata `end` (positivo = il Tris ti deve, negativo = gli devi). */
export async function trisAccountBalanceAt(end: Date): Promise<{ balance: number; hasData: boolean }> {
  const account = await prisma.customer.findUnique({ where: { systemKey: "TRIS" } });
  if (!account) return { balance: 0, hasData: false };
  const [moves, plays] = await Promise.all([
    prisma.suspendedMovement.findMany({
      where: { customerId: account.id, deletedAt: null, date: { lte: end } },
      select: { movementType: true, amount: true },
    }),
    prisma.trisPlay.findMany({
      where: { deletedAt: null, date: { lte: end } },
      select: { playType: true, amount: true },
    }),
  ]);
  let balance = 0;
  for (const m of moves) balance += m.movementType === "DARE" ? Number(m.amount) : -Number(m.amount);
  for (const p of plays) balance += p.playType === "AVERE" ? Number(p.amount) : -Number(p.amount);
  return { balance: Math.round(balance * 100) / 100, hasData: moves.length + plays.length > 0 };
}

/** Archivio mensile Tris: totali giocate del mese + debito a fine mese. */
async function archiveTrisMonth(year: number, month: number, userId: string, note: string) {
  const { start, end } = monthRange(year, month);
  const [plays, legacy] = await Promise.all([
    prisma.trisPlay.findMany({ where: { deletedAt: null, date: { gte: start, lte: end } } }),
    prisma.layMovement.findMany({
      where: { deletedAt: null, category: "TRIS", date: { gte: start, lte: end } },
    }),
  ]);

  let avereTotal = 0;
  let dareTotal = 0;
  for (const p of plays) {
    if (p.playType === "AVERE") avereTotal += Number(p.amount);
    else dareTotal += Number(p.amount);
  }
  // Movimenti Tris del vecchio sistema (dentro il LAY): positivo = Avere, negativo = Dare
  for (const m of legacy) {
    const a = Number(m.amount);
    if (a >= 0) avereTotal += a;
    else dareTotal += Math.abs(a);
  }
  const monthlyBalance = avereTotal - dareTotal;

  const account = await trisAccountBalanceAt(end);
  let cumulativeBalance: number;
  if (account.hasData) {
    // Debito = contrario del saldo del conto Tris
    cumulativeBalance = -account.balance;
  } else {
    // Mesi prima del conto Tris: formula vecchia (debito precedente − (Avere − Dare))
    const prev = await prisma.trisMonthlyClosure.findFirst({
      where: { OR: [{ year: { lt: year } }, { year, month: { lt: month } }] },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    cumulativeBalance = (prev ? Number(prev.cumulativeBalance) : 0) - monthlyBalance;
  }

  const data = {
    dareTotal,
    avereTotal,
    monthlyBalance,
    cumulativeBalance,
    movementCount: plays.length + legacy.length,
    notes: note,
  };
  const row = await prisma.trisMonthlyClosure.upsert({
    where: { year_month: { year, month } },
    update: { ...data, closedAt: new Date() },
    create: { year, month, ...data },
  });
  await writeAuditLog({
    userId,
    entityType: "TrisMonthlyClosure",
    entityId: row.id,
    action: "CLOSE_MONTH",
    newValue: { year, month, monthlyBalance, cumulativeBalance },
  });
}

/**
 * Chiude un mese LAY (e archivia il Tris dello stesso mese).
 * Se esistono chiusure successive le riapre, così i mesi restano in sequenza.
 */
export async function closeLayMonthCore(
  year: number,
  month: number,
  userId: string,
  opts: { automatic?: boolean } = {},
) {
  const laterClosures = await prisma.layMonthlyClosure.findMany({
    where: { OR: [{ year: { gt: year } }, { year, month: { gt: month } }] },
  });
  for (const later of laterClosures) {
    await prisma.layMonthlyClosure.delete({ where: { id: later.id } });
    await writeAuditLog({
      userId,
      entityType: "LayMonthlyClosure",
      entityId: later.id,
      action: "REOPEN_MONTH",
      oldValue: later,
      newValue: { year: later.year, month: later.month, reopened: true, via: "closeEarlierMonth" },
    });
  }
  const laterTris = await prisma.trisMonthlyClosure.findMany({
    where: { OR: [{ year: { gt: year } }, { year, month: { gt: month } }] },
  });
  for (const later of laterTris) {
    await prisma.trisMonthlyClosure.delete({ where: { id: later.id } });
  }

  const { start, end } = monthRange(year, month);
  const movements = await prisma.layMovement.findMany({
    where: { deletedAt: null, date: { gte: start, lte: end } },
  });

  let positive = 0;
  let negative = 0;
  let trisPositive = 0;
  let trisNegative = 0;
  for (const m of movements) {
    const amount = Number(m.amount);
    if (amount >= 0) positive += amount;
    else negative += Math.abs(amount);
    if (m.category === "TRIS") {
      if (amount >= 0) trisPositive += amount;
      else trisNegative += Math.abs(amount);
    }
  }
  const monthlyBalance = positive - negative;
  const trisBalance = trisPositive - trisNegative;

  const prev = await prisma.layMonthlyClosure.findFirst({
    where: { OR: [{ year: { lt: year } }, { year, month: { lt: month } }] },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  const cumulativeBalance = (prev ? Number(prev.cumulativeBalance) : 0) + monthlyBalance;

  const data = {
    positiveTotal: positive,
    negativeTotal: negative,
    monthlyBalance,
    trisPositive,
    trisNegative,
    trisBalance,
    cumulativeBalance,
    movementCount: movements.length,
    notes: opts.automatic ? "Chiuso in automatico il 1° del mese" : null,
  };
  await prisma.layMonthlyClosure.upsert({
    where: { year_month: { year, month } },
    update: { ...data, closedAt: new Date() },
    create: { year, month, ...data },
  });

  await archiveTrisMonth(
    year,
    month,
    userId,
    opts.automatic ? "Chiuso in automatico il 1° del mese" : `Chiuso insieme al LAY ${month}/${year}`,
  );

  await unmarkMonthReopened(year, month);

  await writeAuditLog({
    userId,
    entityType: "LayMonthlyClosure",
    action: opts.automatic ? "AUTO_CLOSE_MONTH" : "CLOSE_MONTH",
    newValue: { year, month, monthlyBalance, movementCount: movements.length },
  });

  return {
    year,
    month,
    monthlyBalance,
    reopenedLater: laterClosures.map((c) => `${c.month}/${c.year}`),
  };
}

/**
 * Chiude da solo i mesi passati non ancora chiusi (dal mese dopo l'ultima chiusura
 * fino al mese scorso), saltando quelli riaperti a mano. Si ferma al primo mese
 * riaperto, così le chiusure restano in sequenza.
 */
export async function autoCloseLayMonths(userId: string, now = new Date()) {
  const last = await prisma.layMonthlyClosure.findFirst({
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  if (!last) return [];

  // Mese corrente in ora italiana
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const curYear = Number(parts.find((p) => p.type === "year")?.value);
  const curMonth = Number(parts.find((p) => p.type === "month")?.value);

  const reopened = await getReopenedMonths();
  const closed: string[] = [];
  let { year, month } = addMonths(last.year, last.month, 1);
  while (monthKey(year, month) < monthKey(curYear, curMonth)) {
    if (reopened.has(ymKey(year, month))) break;
    await closeLayMonthCore(year, month, userId, { automatic: true });
    closed.push(ymKey(year, month));
    ({ year, month } = addMonths(year, month, 1));
  }
  return closed;
}

export async function reopenLayMonthCore(year: number, month: number, userId: string) {
  const existing = await prisma.layMonthlyClosure.findUnique({
    where: { year_month: { year, month } },
  });
  if (!existing) return { error: `Il mese ${month}/${year} non è chiuso` };

  const later = await prisma.layMonthlyClosure.findFirst({
    where: { OR: [{ year: { gt: year } }, { year, month: { gt: month } }] },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });
  if (later) {
    return { error: `Prima riapri i mesi successivi (es. ${later.month}/${later.year})` };
  }

  await prisma.layMonthlyClosure.delete({ where: { id: existing.id } });
  const tris = await prisma.trisMonthlyClosure.findUnique({
    where: { year_month: { year, month } },
  });
  if (tris) await prisma.trisMonthlyClosure.delete({ where: { id: tris.id } });

  await markMonthReopened(year, month);

  await writeAuditLog({
    userId,
    entityType: "LayMonthlyClosure",
    entityId: existing.id,
    action: "REOPEN_MONTH",
    oldValue: existing,
    newValue: { year, month, reopened: true },
  });
  return { success: true };
}
