/** Chiave mese: year * 12 + month (1–12) */
export function monthKey(year: number, month: number) {
  return year * 12 + month;
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
