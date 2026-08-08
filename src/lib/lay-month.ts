import { toNumber } from "./format";

/** Chiave mese: year * 12 + month (1–12) */
export function monthKey(year: number, month: number) {
  return year * 12 + month;
}

export function yearMonthFromDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export function addMonths(year: number, month: number, delta: number) {
  const key = monthKey(year, month) + delta;
  const y = Math.floor((key - 1) / 12);
  const m = ((key - 1) % 12) + 1;
  return { year: y, month: m };
}

/**
 * Primo mese ancora da chiudere (buco nella sequenza), fino al mese corrente incluso.
 * Es. chiusi gen–giu e agosto, corrente agosto → restituisce luglio.
 */
export function findNextMonthToClose(
  closures: Array<{ year: number; month: number }>,
  currentYear: number,
  currentMonth: number,
): { year: number; month: number } | null {
  const current = monthKey(currentYear, currentMonth);
  if (closures.length === 0) {
    return { year: currentYear, month: currentMonth };
  }

  const closed = new Set(closures.map((c) => monthKey(c.year, c.month)));
  const sorted = [...closures].sort((a, b) => monthKey(a.year, a.month) - monthKey(b.year, b.month));
  let { year, month } = sorted[0];

  while (monthKey(year, month) <= current) {
    if (!closed.has(monthKey(year, month))) {
      return { year, month };
    }
    ({ year, month } = addMonths(year, month, 1));
  }

  return null;
}

type MovementLike = {
  date: Date | string;
  amount: unknown;
  category?: string | null;
};

/** Somma live delle operazioni per ogni mese (tutte le categorie LAY). */
export function sumLayMovementsByMonth(movements: MovementLike[]) {
  const map = new Map<
    string,
    { year: number; month: number; positive: number; negative: number; tris: number; count: number }
  >();

  for (const m of movements) {
    const { year, month } = yearMonthFromDate(m.date);
    const key = `${year}-${month}`;
    const row = map.get(key) ?? { year, month, positive: 0, negative: 0, tris: 0, count: 0 };
    const amount = toNumber(m.amount);
    if (amount >= 0) row.positive += amount;
    else row.negative += Math.abs(amount);
    if (m.category === "TRIS") row.tris += amount;
    row.count += 1;
    map.set(key, row);
  }

  return map;
}

/** Somma live solo operazioni Tris per mese. */
export function sumTrisMovementsByMonth(movements: MovementLike[]) {
  const map = new Map<
    string,
    { year: number; month: number; avere: number; dare: number; count: number }
  >();

  for (const m of movements) {
    if (m.category !== "TRIS") continue;
    const { year, month } = yearMonthFromDate(m.date);
    const key = `${year}-${month}`;
    const row = map.get(key) ?? { year, month, avere: 0, dare: 0, count: 0 };
    const amount = toNumber(m.amount);
    if (amount >= 0) row.avere += amount;
    else row.dare += Math.abs(amount);
    row.count += 1;
    map.set(key, row);
  }

  return map;
}
