import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getLaySummary } from "@/lib/calculations-server";
import { requireSession } from "@/lib/auth";
import { isMaster } from "@/lib/roles";
import { formatEUR, amountClass, toNumber } from "@/lib/format";
import { applyTrisDebt } from "@/lib/calculations";
import { formatDateIT, formatDateTimeIT } from "@/lib/timezone";
import { Card } from "@/components/ui";
import {
  TrisArchivesTable,
  TrisMovementsTable,
  type TrisArchiveRow,
  type TrisMovementRow,
} from "@/components/lay/tris-tables";

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
    summary.trisClosures.map((c) => [`${c.year}-${c.month}`, c]),
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

  const archiveRows: TrisArchiveRow[] = [
    ...summary.trisClosures.map((c) => ({
      id: c.id,
      monthLabel: `${MONTH_LABELS[c.month - 1]} ${c.year}`,
      avereLabel: formatEUR(c.avereTotal),
      dareLabel: formatEUR(c.dareTotal),
      monthBalanceLabel: formatEUR(c.monthlyBalance),
      monthBalance: toNumber(c.monthlyBalance),
      cumulativeLabel: formatEUR(c.cumulativeBalance),
      cumulative: toNumber(c.cumulativeBalance),
      movementCount: String(c.movementCount),
      statusLabel: "Chiuso",
    })),
    ...((summary.trisMonthAvere !== 0 || summary.trisMonthDare !== 0) &&
    !summary.trisClosures.some(
      (c) => c.year === summary.trisMonthYear && c.month === summary.trisMonthMonth,
    )
      ? [
          {
            id: `open-${summary.trisMonthYear}-${summary.trisMonthMonth}`,
            monthLabel,
            avereLabel: formatEUR(summary.trisMonthAvere),
            dareLabel: formatEUR(summary.trisMonthDare),
            monthBalanceLabel: formatEUR(summary.trisMonthBalance),
            monthBalance: summary.trisMonthBalance,
            cumulativeLabel: formatEUR(summary.trisCumulative),
            cumulative: summary.trisCumulative,
            movementCount: "—",
            statusLabel: "In corso",
          },
        ]
      : []),
  ];

  const movementRows: TrisMovementRow[] = display.map((m) => {
    const amount = toNumber(m.amount);
    return {
      id: m.id,
      dateLabel: `${formatDateIT(m.date)}${m.time ? ` ${m.time}` : ""}`,
      tipo: amount >= 0 ? "Avere" : "Dare",
      amount,
      amountLabel: formatEUR(Math.abs(amount)),
      runningLabel: formatEUR(m.runningBalance),
      runningBalance: m.runningBalance,
      notes: m.notes || m.description || "—",
      authorName: m.createdBy.name,
      authorDetail: formatDateTimeIT(m.createdAt),
    };
  });

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
          Debito Tris: ogni <strong>Avere (+)</strong> lo riduce, ogni <strong>Dare (−)</strong> lo
          aumenta. Esempio: giugno 2099 − luglio 14 = 2085 − agosto 200 = 1885.
        </p>
        <TrisArchivesTable rows={archiveRows} />
      </Card>

      <Card title="Tutti i movimenti Tris">
        <p className="mb-3 text-sm text-slate-500">
          Avere (+) riduce il debito · Dare (−) lo aumenta · “Saldo dopo” = debito aggiornato
        </p>
        <TrisMovementsTable rows={movementRows} showAuthor={showAuthor} />
      </Card>
    </div>
  );
}
