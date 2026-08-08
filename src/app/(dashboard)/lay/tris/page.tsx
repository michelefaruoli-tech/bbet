import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getLaySummary } from "@/lib/calculations-server";
import { requireSession } from "@/lib/auth";
import { isMaster } from "@/lib/roles";
import { formatEUR, amountClass, toNumber } from "@/lib/format";
import { applyTrisDebt } from "@/lib/calculations";
import { formatDateIT, formatDateTimeIT } from "@/lib/timezone";
import { Card } from "@/components/ui";
import { DeleteLayButton } from "@/components/lay/delete-lay-button";

const MONTH_LABELS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export default async function TrisSchedaPage() {
  const session = await requireSession();
  const showAuthor = isMaster(session.role);
  const summary = await getLaySummary();

  const trisMovements = await prisma.layMovement.findMany({
    where: { deletedAt: null, category: "TRIS" },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { createdBy: { select: { name: true } } },
  });

  const chronological = [...trisMovements].reverse();
  const closureMap = new Map(
    summary.trisClosures.map((c) => [`${c.year}-${c.month}`, c] as const),
  );

  // Raggruppa per mese e calcola saldo debito dopo ogni operazione
  const monthOrder: string[] = [];
  const byMonth = new Map<string, typeof chronological>();
  for (const m of chronological) {
    const d = new Date(m.date);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
    if (!byMonth.has(key)) {
      byMonth.set(key, []);
      monthOrder.push(key);
    }
    byMonth.get(key)!.push(m);
  }

  let running = 0;
  if (monthOrder.length > 0) {
    const [fy, fm] = monthOrder[0].split("-").map(Number);
    const prev = [...summary.trisClosures]
      .filter((c) => c.year < fy || (c.year === fy && c.month < fm))
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .at(-1);
    running = prev ? toNumber(prev.cumulativeBalance) : 0;
  }

  const runningById = new Map<string, number>();
  for (const key of monthOrder) {
    const movs = byMonth.get(key)!;
    const closed = closureMap.get(key);
    if (closed) {
      // Mese già archiviato: il saldo dopo = cumulativo registrato in chiusura
      running = toNumber(closed.cumulativeBalance);
      for (const m of movs) runningById.set(m.id, running);
    } else {
      // Mese aperto: Avere riduce il debito, Dare lo aumenta
      for (const m of movs) {
        running = applyTrisDebt(running, toNumber(m.amount));
        runningById.set(m.id, running);
      }
    }
  }

  const display = chronological
    .map((m) => ({ ...m, runningBalance: runningById.get(m.id) ?? 0 }))
    .reverse();

  const monthLabel = `${MONTH_LABELS[summary.trisMonthMonth - 1]} ${summary.trisMonthYear}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/lay" className="text-sm text-emerald-700 hover:underline">
          ← Torna a LAY
        </Link>
        <h1 className="text-2xl font-bold">Scheda Rendiconto Tris</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Saldo Tris attuale">
          <p className={`text-2xl font-bold ${amountClass(summary.trisCumulative)}`}>
            {formatEUR(summary.trisCumulative)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.trisCumulative >= 0 ? "Quanto devi" : "Loro devono a te"} · Avere lo riduce
          </p>
        </Card>
        <Card title={`Totale Avere — ${monthLabel}`}>
          <p className="text-xl font-bold text-emerald-700">{formatEUR(summary.trisMonthAvere)}</p>
          <p className="mt-1 text-xs text-slate-400">Solo mese in corso · si azzera ogni mese</p>
        </Card>
        <Card title={`Totale Dare — ${monthLabel}`}>
          <p className="text-xl font-bold text-amber-700">{formatEUR(summary.trisMonthDare)}</p>
          <p className="mt-1 text-xs text-slate-400">Solo mese in corso · si azzera ogni mese</p>
        </Card>
        <Card title="Movimenti Tris">
          <p className="text-xl font-bold">{trisMovements.length}</p>
        </Card>
      </div>

      <Card title="Archivi mensili Tris">
        <p className="mb-3 text-sm text-slate-500">
          A ogni chiusura mese restano registrati Dare, Avere e Saldo Tris del mese, più il
          cumulativo (debito).
        </p>
        <div className="overflow-x-auto">
          <table className="data-table text-sm">
            <thead>
              <tr>
                <th>Mese</th>
                <th>Avere (+)</th>
                <th>Dare (−)</th>
                <th>Saldo mese</th>
                <th>Cumulativo (debito)</th>
                <th>Mov.</th>
              </tr>
            </thead>
            <tbody>
              {summary.trisClosures.map((c) => (
                <tr key={c.id}>
                  <td>
                    {MONTH_LABELS[c.month - 1]} {c.year}
                  </td>
                  <td className="text-emerald-700">{formatEUR(c.avereTotal)}</td>
                  <td className="text-amber-700">{formatEUR(c.dareTotal)}</td>
                  <td className={amountClass(toNumber(c.monthlyBalance))}>
                    {formatEUR(c.monthlyBalance)}
                  </td>
                  <td className={amountClass(toNumber(c.cumulativeBalance))}>
                    {formatEUR(c.cumulativeBalance)}
                  </td>
                  <td>{c.movementCount}</td>
                </tr>
              ))}
              {(summary.trisMonthAvere !== 0 || summary.trisMonthDare !== 0) &&
                !summary.trisClosures.some(
                  (c) => c.year === summary.trisMonthYear && c.month === summary.trisMonthMonth,
                ) && (
                  <tr className="bg-amber-50">
                    <td>
                      {monthLabel}{" "}
                      <span className="text-xs font-normal text-amber-700">(in corso)</span>
                    </td>
                    <td className="text-emerald-700">{formatEUR(summary.trisMonthAvere)}</td>
                    <td className="text-amber-700">{formatEUR(summary.trisMonthDare)}</td>
                    <td className={amountClass(summary.trisMonthBalance)}>
                      {formatEUR(summary.trisMonthBalance)}
                    </td>
                    <td className={amountClass(summary.trisCumulative)}>
                      {formatEUR(summary.trisCumulative)}
                    </td>
                    <td>—</td>
                  </tr>
                )}
              {summary.trisClosures.length === 0 &&
                summary.trisMonthAvere === 0 &&
                summary.trisMonthDare === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-400">
                      Nessun archivio mensile ancora
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Tutti i movimenti Tris">
        <p className="mb-3 text-sm text-slate-500">
          Avere (+) riduce il debito · Dare (−) lo aumenta · “Saldo dopo” = debito aggiornato
        </p>
        <div className="overflow-x-auto">
          <table className="data-table sospesi-table text-sm">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Importo</th>
                <th>Saldo dopo</th>
                <th>Note</th>
                {showAuthor && <th>Inserito da</th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {display.map((m, i) => {
                const amount = toNumber(m.amount);
                const tipo = amount >= 0 ? "Avere" : "Dare";
                return (
                  <tr
                    key={m.id}
                    className={`sospesi-row ${i % 2 === 0 ? "sospesi-row-even" : "sospesi-row-odd"}`}
                  >
                    <td className="whitespace-nowrap">
                      {formatDateIT(m.date)}
                      {m.time ? ` ${m.time}` : ""}
                    </td>
                    <td className={amountClass(amount)}>{tipo}</td>
                    <td className={amountClass(amount)}>{formatEUR(Math.abs(amount))}</td>
                    <td className={amountClass(m.runningBalance)}>
                      {formatEUR(m.runningBalance)}
                    </td>
                    <td className="max-w-[14rem] truncate">{m.notes || m.description || "—"}</td>
                    {showAuthor && (
                      <td className="text-xs text-slate-600">
                        {m.createdBy.name}
                        <span className="mt-0.5 block text-slate-400">
                          {formatDateTimeIT(m.createdAt)}
                        </span>
                      </td>
                    )}
                    <td>
                      <DeleteLayButton id={m.id} />
                    </td>
                  </tr>
                );
              })}
              {display.length === 0 && (
                <tr>
                  <td colSpan={showAuthor ? 7 : 6} className="py-6 text-center text-slate-400">
                    Nessun movimento Tris ancora
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
