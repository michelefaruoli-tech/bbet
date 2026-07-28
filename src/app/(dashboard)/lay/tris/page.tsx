import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getLaySummary } from "@/lib/calculations-server";
import { requireSession } from "@/lib/auth";
import { isMaster } from "@/lib/roles";
import { formatEUR, amountClass, toNumber } from "@/lib/format";
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

  let running = 0;
  // Saldo progressivo cronologico (dal più vecchio)
  const chronological = [...trisMovements].reverse();
  const withRunning = chronological.map((m) => {
    running += toNumber(m.amount);
    return { ...m, runningBalance: running };
  });
  const display = [...withRunning].reverse();

  const avereTot = trisMovements
    .filter((m) => toNumber(m.amount) > 0)
    .reduce((s, m) => s + toNumber(m.amount), 0);
  const dareTot = trisMovements
    .filter((m) => toNumber(m.amount) < 0)
    .reduce((s, m) => s + Math.abs(toNumber(m.amount)), 0);

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
            {summary.trisCumulative >= 0 ? "Quanto devi" : "Loro devono a te"}
          </p>
        </Card>
        <Card title="Totale Avere (+)">
          <p className="text-xl font-bold text-emerald-700">{formatEUR(avereTot)}</p>
        </Card>
        <Card title="Totale Dare (−)">
          <p className="text-xl font-bold text-amber-700">{formatEUR(dareTot)}</p>
        </Card>
        <Card title="Movimenti Tris">
          <p className="text-xl font-bold">{trisMovements.length}</p>
        </Card>
      </div>

      {summary.trisClosures.length > 0 && (
        <Card title="Archivi mensili Tris">
          <div className="overflow-x-auto">
            <table className="data-table text-sm">
              <thead>
                <tr>
                  <th>Mese</th>
                  <th>Avere (+)</th>
                  <th>Dare (−)</th>
                  <th>Saldo mese</th>
                  <th>Cumulativo</th>
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
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="Tutti i movimenti Tris">
        <p className="mb-3 text-sm text-slate-500">
          Elenco completo · Avere = positivo · Dare = negativo · Saldo progressivo dopo ogni
          operazione
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
