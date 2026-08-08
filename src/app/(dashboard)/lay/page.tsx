import Link from "next/link";
import { getLaySummary } from "@/lib/calculations-server";
import { requireSession } from "@/lib/auth";
import { isMaster } from "@/lib/roles";
import { formatEUR, amountClass, toNumber } from "@/lib/format";
import { findNextMonthToClose, sumLayMovementsByMonth, sumTrisMovementsByMonth } from "@/lib/lay-month";
import { Card } from "@/components/ui";
import { CloseLayMonthButton } from "@/components/lay/close-lay-month-button";
import { LayYearTable } from "@/components/lay/lay-year-table";
import { TrisYearTable } from "@/components/lay/tris-year-table";
import { LayFilters } from "@/components/lay/lay-filters";
import { QuickLayForm } from "@/components/lay/quick-lay-form";
import { LayOperationsHistory } from "@/components/lay/lay-operations-history";
import { LayMovementForm } from "@/components/lay/lay-movement-form";

export default async function LayPage({
  searchParams,
}: {
  searchParams: Promise<{ anni?: string; anno?: string; mese?: string }>;
}) {
  const params = await searchParams;
  const session = await requireSession();
  const showAuthor = isMaster(session.role);
  const summary = await getLaySummary();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const nextClose = findNextMonthToClose(summary.closures, currentYear, currentMonth);

  const allYears = Array.from(
    new Set([
      ...summary.closures.map((c) => c.year),
      ...summary.trisClosures.map((c) => c.year),
      ...summary.movements.map((m) => new Date(m.date).getUTCFullYear()),
      currentYear,
    ]),
  ).sort((a, b) => a - b);

  const selectedYears = params.anni
    ? params.anni
        .split(",")
        .map(Number)
        .filter((y) => allYears.includes(y))
    : allYears;

  const filterYear = params.anno ?? "";
  const filterMonth = params.mese ?? "";

  const closedKeys = new Set(summary.closures.map((c) => `${c.year}-${c.month}`));
  const trisClosedKeys = new Set(summary.trisClosures.map((c) => `${c.year}-${c.month}`));

  const liveLay = sumLayMovementsByMonth(summary.movements);
  const liveTris = sumTrisMovementsByMonth(summary.movements);

  // Celle LAY: mesi chiusi dall'archivio + mesi aperti dalla somma live cronologia
  const cellsMap = new Map<string, {
    year: number;
    month: number;
    balance: number;
    positiveTotal: number;
    negativeTotal: number;
    trisBalance: number;
    cumulativeBalance: number | null;
    movementCount: number;
    closed: boolean;
  }>();

  for (const c of summary.closures) {
    cellsMap.set(`${c.year}-${c.month}`, {
      year: c.year,
      month: c.month,
      balance: toNumber(c.monthlyBalance),
      positiveTotal: toNumber(c.positiveTotal),
      negativeTotal: toNumber(c.negativeTotal),
      trisBalance: toNumber(c.trisBalance),
      cumulativeBalance: toNumber(c.cumulativeBalance),
      movementCount: c.movementCount,
      closed: true,
    });
  }
  for (const [key, live] of liveLay) {
    if (closedKeys.has(key)) continue;
    cellsMap.set(key, {
      year: live.year,
      month: live.month,
      balance: live.positive - live.negative,
      positiveTotal: live.positive,
      negativeTotal: live.negative,
      trisBalance: live.tris,
      cumulativeBalance: null,
      movementCount: live.count,
      closed: false,
    });
  }
  const cells = Array.from(cellsMap.values());

  const trisCellsMap = new Map<string, {
    year: number;
    month: number;
    dareTotal: number;
    avereTotal: number;
    monthlyBalance: number;
    cumulativeBalance: number | null;
    movementCount: number;
    closed: boolean;
  }>();

  for (const c of summary.trisClosures) {
    trisCellsMap.set(`${c.year}-${c.month}`, {
      year: c.year,
      month: c.month,
      dareTotal: toNumber(c.dareTotal),
      avereTotal: toNumber(c.avereTotal),
      monthlyBalance: toNumber(c.monthlyBalance),
      cumulativeBalance: toNumber(c.cumulativeBalance),
      movementCount: c.movementCount,
      closed: true,
    });
  }
  for (const [key, live] of liveTris) {
    if (trisClosedKeys.has(key)) continue;
    trisCellsMap.set(key, {
      year: live.year,
      month: live.month,
      dareTotal: live.dare,
      avereTotal: live.avere,
      monthlyBalance: live.avere - live.dare,
      cumulativeBalance: null,
      movementCount: live.count,
      closed: false,
    });
  }
  const trisCells = Array.from(trisCellsMap.values());

  const operations = summary.movements.map((m) => {
    const d = new Date(m.date);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
    return {
      id: m.id,
      date: m.date,
      time: m.time,
      amount: m.amount,
      category: m.category,
      description: m.description,
      notes: m.notes,
      createdBy: m.createdBy,
      isOpenMonth: !closedKeys.has(key),
    };
  });

  const closeYear = nextClose?.year ?? currentYear;
  const closeMonth = nextClose?.month ?? currentMonth;
  const monthMovements = summary.movements.filter((m) => {
    const d = new Date(m.date);
    return d.getUTCFullYear() === closeYear && d.getUTCMonth() + 1 === closeMonth;
  });
  const monthBalance = monthMovements.reduce((s, m) => s + toNumber(m.amount), 0);
  const trisOpenCount = monthMovements.filter((m) => m.category === "TRIS").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">LAY</h1>
          <p className="text-sm text-slate-500">
            Operazioni · un solo tasto chiude LAY + Tris ·{" "}
            <Link href="/lay/tris" className="font-medium text-emerald-700 underline">
              Scheda Rendiconto Tris
            </Link>
          </p>
        </div>
        {nextClose ? (
          <CloseLayMonthButton
            year={nextClose.year}
            month={nextClose.month}
            alreadyClosed={false}
            previewBalance={monthBalance}
          />
        ) : (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Nessun mese da chiudere fino a {currentMonth}/{currentYear}
          </p>
        )}
      </div>

      {nextClose && (nextClose.year !== currentYear || nextClose.month !== currentMonth) && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          C’è un mese precedente ancora aperto: chiudi prima{" "}
          <strong>
            {nextClose.month}/{nextClose.year}
          </strong>{" "}
          (saldo {formatEUR(monthBalance)}), poi potrai chiudere i mesi successivi.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title={`Saldo da chiudere ${closeMonth}/${closeYear}`}>
          <p className={`text-xl font-bold ${amountClass(monthBalance)}`}>{formatEUR(monthBalance)}</p>
        </Card>
        <Card title="Saldo cassa LAY">
          <p className={`text-xl font-bold ${amountClass(summary.cumulativeBalance)}`}>
            {formatEUR(summary.cumulativeBalance)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Cassa separata</p>
        </Card>
        <Card title="Tris attuale (quanto devi)">
          <p className={`text-xl font-bold ${amountClass(summary.trisCumulative)}`}>
            {formatEUR(summary.trisCumulative)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {trisOpenCount > 0 ? `${trisOpenCount} mov. nel mese da chiudere · ` : ""}
            <Link href="/lay/tris" className="underline">
              Vedi scheda Tris
            </Link>
          </p>
        </Card>
        <Card title="Mesi chiusi">{summary.closures.length}</Card>
      </div>

      <Card title="Inserimento rapido">
        <QuickLayForm trisBalance={summary.trisCumulative} />
      </Card>

      <Card title="Filtri">
        <LayFilters
          years={allYears}
          selectedYears={selectedYears.length ? selectedYears : allYears}
          filterYear={filterYear}
          filterMonth={filterMonth}
        />
      </Card>

      <Card title="Archivio mensile LAY">
        <p className="mb-3 text-xs text-slate-500">
          Ogni cella = somma delle operazioni di quel mese. I mesi aperti (bordo tratteggiato /
          “in corso”) si aggiornano da soli quando inserisci movimenti. Dopo la chiusura restano
          archiviati. Clicca un importo per il dettaglio.
        </p>
        <LayYearTable
          years={allYears}
          cells={cells}
          selectedYears={selectedYears.length ? selectedYears : allYears}
        />
      </Card>

      <Card title="Archivio mensile Tris">
        <p className="mb-3 text-xs text-slate-500">
          Stessa logica: somma live delle sole operazioni Tris del mese. Dettaglio completo nella{" "}
          <Link href="/lay/tris" className="font-medium text-emerald-700 underline">
            Scheda Rendiconto Tris
          </Link>
          .
        </p>
        <TrisYearTable
          years={allYears}
          cells={trisCells}
          selectedYears={selectedYears.length ? selectedYears : allYears}
        />
      </Card>

      <Card title="Cronologia operazioni">
        <LayOperationsHistory
          operations={operations}
          filterYear={filterYear}
          filterMonth={filterMonth}
          showAuthor={showAuthor}
        />
      </Card>

      <details className="rounded-lg border border-slate-300 bg-slate-50/80">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">
          Form completo (data/ora personalizzata)
        </summary>
        <div className="border-t border-slate-200 p-4">
          <LayMovementForm />
        </div>
      </details>
    </div>
  );
}
