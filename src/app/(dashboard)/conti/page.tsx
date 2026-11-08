import Link from "next/link";
import { getLaySummary } from "@/lib/calculations-server";
import { formatEUR, toNumber } from "@/lib/format";
import { findNextMonthToClose, sumLayMovementsByMonth } from "@/lib/lay-month";
import { Card, PageHeader, SignedAmount, Tabs } from "@/components/ui";
import { CONTI_TABS } from "@/components/layout/sections";
import { CloseLayMonthButton } from "@/components/lay/close-lay-month-button";
import { ReopenLayMonthButton } from "@/components/lay/reopen-lay-month-button";
import { QuickLayForm } from "@/components/lay/quick-lay-form";
import { LayOperationsHistory } from "@/components/lay/lay-operations-history";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
const MONTHS_LONG = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];

export default async function LayPage({
  searchParams,
}: {
  searchParams: Promise<{ anno?: string; mese?: string }>;
}) {
  const params = await searchParams;
  const summary = await getLaySummary();
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth() + 1;

  const years = Array.from(
    new Set([...summary.closures.map((c) => c.year), ...summary.movements.map((m) => new Date(m.date).getUTCFullYear()), curY]),
  ).sort((a, b) => b - a);
  const showAll = params.anno === "tutti";
  const year = years.includes(Number(params.anno)) ? Number(params.anno) : curY;
  const filterMonth = params.mese ?? "";

  const closedMap = new Map(summary.closures.map((c) => [`${c.year}-${c.month}`, c]));
  const live = sumLayMovementsByMonth(summary.movements);
  const lastClosure = summary.closures[summary.closures.length - 1];

  const cells = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const key = `${year}-${month}`;
    const closed = closedMap.get(key);
    const l = live.get(key);
    const future = year > curY || (year === curY && month > curM);
    const balance = closed ? toNumber(closed.monthlyBalance) : l ? l.positive - l.negative : 0;
    const count = closed ? closed.movementCount : (l?.count ?? 0);
    return { month, closed: Boolean(closed), future, balance, count, hasData: Boolean(closed || l) };
  });

  // Totali per anno (mesi chiusi dall'archivio + mesi aperti dai movimenti)
  const yearStats = new Map<number, { total: number; months: number }>();
  const addMonth = (y: number, value: number) => {
    const row = yearStats.get(y) ?? { total: 0, months: 0 };
    row.total += value;
    row.months += 1;
    yearStats.set(y, row);
  };
  for (const c of summary.closures) addMonth(c.year, toNumber(c.monthlyBalance));
  for (const [key, l] of live) {
    if (closedMap.has(key)) continue;
    addMonth(l.year, l.positive - l.negative);
  }
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const yearRows = [...yearStats.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([y, r]) => ({ year: y, total: round2(r.total), months: r.months, avg: round2(r.total / r.months) }));
  const allTotal = round2(yearRows.reduce((s, r) => s + r.total, 0));
  const allMonths = yearRows.reduce((s, r) => s + r.months, 0);
  const allAvg = allMonths ? round2(allTotal / allMonths) : 0;
  const selected = yearRows.find((r) => r.year === year);

  const curKey = `${curY}-${curM}`;
  const curLive = live.get(curKey);
  const currentBalance = curLive ? curLive.positive - curLive.negative : 0;

  const nextClose = findNextMonthToClose(summary.closures, curY, curM);
  const pendingPast = nextClose && (nextClose.year < curY || (nextClose.year === curY && nextClose.month < curM)) ? nextClose : null;
  const pendingBalance = pendingPast
    ? (() => {
        const l = live.get(`${pendingPast.year}-${pendingPast.month}`);
        return l ? l.positive - l.negative : 0;
      })()
    : 0;

  const closedKeys = new Set(summary.closures.map((c) => `${c.year}-${c.month}`));
  const operations = summary.movements.map((m) => {
    const d = new Date(m.date);
    return {
      id: m.id,
      date: m.date,
      time: m.time,
      amount: m.amount,
      category: m.category,
      description: m.description,
      notes: m.notes,
      createdBy: m.createdBy,
      isOpenMonth: !closedKeys.has(`${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`),
    };
  });

  return (
    <>
      <PageHeader title="Conti" section="lay">
        <Tabs items={CONTI_TABS} active="/conti" label="Scegli conto" />
      </PageHeader>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-card p-5">
          <span className="text-[13px] font-medium text-muted">Saldo LAY complessivo</span>
          <div className="text-[28px] font-bold">
            <SignedAmount value={summary.cumulativeBalance} />
          </div>
          <span className="text-[13px] text-muted">nel conteggio di cassa si sottrae</span>
        </div>
        <div className="rounded-xl border border-line bg-card p-5">
          <span className="text-[13px] font-medium text-muted">
            {MONTHS_LONG[curM - 1][0].toUpperCase() + MONTHS_LONG[curM - 1].slice(1)} (in corso)
          </span>
          <div className="text-[28px] font-bold">
            <SignedAmount value={currentBalance} />
          </div>
          <span className="text-[13px] text-muted">{curLive?.count ?? 0} operazioni</span>
        </div>
        <div className="rounded-xl border border-line bg-card p-5">
          {lastClosure ? (
            <>
              <span className="text-[13px] font-medium text-muted">
                Ultimo mese chiuso: {MONTHS_LONG[lastClosure.month - 1]} {lastClosure.year}
              </span>
              <div className="text-[28px] font-bold">
                <SignedAmount value={toNumber(lastClosure.monthlyBalance)} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
                {lastClosure.movementCount} operazioni
                <ReopenLayMonthButton year={lastClosure.year} month={lastClosure.month} />
              </div>
            </>
          ) : (
            <span className="text-[13px] font-medium text-muted">Nessun mese chiuso</span>
          )}
        </div>
      </section>

      {pendingPast && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-minus-line bg-minus-soft px-6 py-4 text-sm">
          <span>
            {MONTHS_LONG[pendingPast.month - 1]} {pendingPast.year} è stato riaperto (saldo {formatEUR(pendingBalance)}).
            Quando hai finito di correggerlo, richiudilo: i mesi dopo si chiuderanno di nuovo da soli.
          </span>
          <CloseLayMonthButton year={pendingPast.year} month={pendingPast.month} previewBalance={pendingBalance} />
        </div>
      )}

      <QuickLayForm />

      <Card
        title={showAll ? "Tutti gli anni" : `${year} mese per mese`}
        action={
          <nav aria-label="Anno" className="flex flex-wrap gap-1">
            <Link
              href="/conti?anno=tutti"
              aria-current={showAll ? "page" : undefined}
              className={cn(
                "inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-semibold",
                showAll ? "bg-sec-lay text-white" : "text-sec-lay hover:underline",
              )}
            >
              Tutti
            </Link>
            {years.map((y) => (
              <Link
                key={y}
                href={`/conti?anno=${y}`}
                aria-current={!showAll && y === year ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-semibold",
                  !showAll && y === year ? "bg-btn text-white" : "text-muted hover:text-ink",
                )}
              >
                {y}
              </Link>
            ))}
          </nav>
        }
      >
        {showAll ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Anno</th>
                  <th className="!text-right">Mesi</th>
                  <th className="!text-right">Totale anno</th>
                  <th className="!text-right">Media mensile</th>
                </tr>
              </thead>
              <tbody>
                {yearRows.map((r) => (
                  <tr key={r.year}>
                    <td>
                      <Link href={`/conti?anno=${r.year}`} className="font-semibold hover:underline">
                        {r.year}
                      </Link>
                    </td>
                    <td className="text-right text-muted">{r.months}</td>
                    <td className="text-right">
                      <SignedAmount value={r.total} />
                    </td>
                    <td className="text-right">
                      <SignedAmount value={r.avg} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-sec-lay-soft">
                  <td className="font-bold">Tutti gli anni</td>
                  <td className="text-right font-semibold">{allMonths}</td>
                  <td className="text-right text-base">
                    <SignedAmount value={allTotal} />
                  </td>
                  <td className="text-right text-base">
                    <SignedAmount value={allAvg} />
                  </td>
                </tr>
              </tfoot>
            </table>
            <p className="mt-3 text-[13px] text-muted">
              Media = totale diviso i mesi con movimenti o chiusure. Il saldo LAY attuale può differire dal totale perché a
              giugno 2026 il saldo di cassa è stato ripartito da −803 €.
            </p>
          </div>
        ) : (
        <>
        <p className="mb-3 text-[13px] text-muted">
          I mesi si chiudono da soli il 1° del mese dopo · clicca un mese per vederne le operazioni
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {cells.map((c) => (
            <Link
              key={c.month}
              href={`/conti?anno=${year}&mese=${c.month}#operazioni`}
              aria-current={String(c.month) === filterMonth ? "true" : undefined}
              className={cn(
                "flex flex-col gap-0.5 rounded-[10px] border px-3 py-2.5 text-sm",
                c.closed && "border-line bg-card",
                !c.closed && !c.future && "border-dashed border-accent bg-accent-soft",
                c.future && "pointer-events-none border-line bg-card opacity-50",
                String(c.month) === filterMonth && "ring-2 ring-ink",
              )}
            >
              <span className="text-[13px] font-medium text-muted">
                {MONTHS[c.month - 1]}
                {!c.closed && !c.future && c.hasData ? " · aperto" : ""}
              </span>
              {c.hasData ? <SignedAmount value={c.balance} /> : <strong>—</strong>}
            </Link>
          ))}
        </div>
        {selected && (
          <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 rounded-[10px] bg-sec-lay-soft px-4 py-3 tnum">
            <div>
              <span className="text-[13px] font-medium text-muted">Totale {year}</span>
              <div className="text-xl font-bold">
                <SignedAmount value={selected.total} />
              </div>
            </div>
            <div>
              <span className="text-[13px] font-medium text-muted">Media mensile</span>
              <div className="text-xl font-bold">
                <SignedAmount value={selected.avg} />
              </div>
            </div>
            <span className="text-[13px] text-muted">su {selected.months} mesi</span>
            <Link href="/conti?anno=tutti" className="ml-auto text-sm text-accent hover:underline">
              Confronta tutti gli anni
            </Link>
          </div>
        )}
        </>
        )}
      </Card>

      <section id="operazioni" className="rounded-xl border border-line bg-card px-6 py-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">
            Operazioni{filterMonth ? ` · ${MONTHS_LONG[Number(filterMonth) - 1]} ${year}` : ""}
          </h2>
          {filterMonth && (
            <Link href={`/conti?anno=${year}`} className="text-sm text-accent hover:underline">
              Mostra tutte
            </Link>
          )}
        </div>
        <LayOperationsHistory
          operations={operations}
          filterYear={filterMonth ? String(year) : ""}
          filterMonth={filterMonth}
          showAuthor
        />
      </section>
    </>
  );
}
