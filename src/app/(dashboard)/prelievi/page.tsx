import { prisma } from "@/lib/prisma";
import { getLaySummary } from "@/lib/calculations-server";
import { formatEUR, amountClass, toNumber } from "@/lib/format";
import { formatDateIT } from "@/lib/timezone";
import { Card } from "@/components/ui";
import { WithdrawalForm } from "@/components/prelievi/withdrawal-form";
import { WithdrawalsTable, type WithdrawalRow } from "@/components/prelievi/withdrawals-table";

const MONTH_LABELS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export default async function PrelieviPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? Number(params.year) : now.getFullYear();
  const month = now.getMonth() + 1;

  const [withdrawals, lay, commissionMonth] = await Promise.all([
    prisma.withdrawal.findMany({
      where: { deletedAt: null, year },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { createdBy: { select: { name: true } } },
    }),
    getLaySummary(),
    prisma.commissionMonth.findFirst({ where: { year, month } }),
  ]);

  const fromCommissioni = withdrawals
    .filter((w) => w.source === "COMMISSIONI")
    .reduce((s, w) => s + Number(w.amount), 0);
  const fromLay = withdrawals
    .filter((w) => w.source === "LAY")
    .reduce((s, w) => s + Number(w.amount), 0);
  const total = fromCommissioni + fromLay;

  const commissionFinal = commissionMonth ? toNumber(commissionMonth.finalTotal) : 0;
  const commissionWithdrawalsMonth = commissionMonth ? toNumber(commissionMonth.withdrawals) : 0;

  const withdrawalRows: WithdrawalRow[] = withdrawals.map((w) => ({
    id: w.id,
    dateLabel: formatDateIT(w.date),
    amountLabel: formatEUR(w.amount),
    sourceLabel: w.source === "LAY" ? "LAY" : "Commissioni",
    destination: w.destination ?? "Contanti",
    periodLabel: `${MONTH_LABELS[w.month - 1]} ${w.year}`,
    notes: w.notes ?? w.description ?? "—",
    userName: w.createdBy.name,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Prelievi</h1>
          <p className="text-sm text-slate-500">
            Solo da Commissioni o LAY · sempre in contanti · aggiorna i saldi automaticamente
          </p>
        </div>
        <a href="/api/export/prelievi" className="text-sm text-emerald-600 hover:underline">
          Esporta CSV
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title={`Da Commissioni ${year}`}>
          <p className="text-xl font-bold">{formatEUR(fromCommissioni)}</p>
        </Card>
        <Card title={`Da LAY ${year}`}>
          <p className="text-xl font-bold">{formatEUR(fromLay)}</p>
        </Card>
        <Card title={`Totale prelievi ${year}`}>
          <p className="text-xl font-bold">{formatEUR(total)}</p>
        </Card>
        <Card title="Saldo cassa LAY">
          <p className={`text-xl font-bold ${amountClass(lay.cumulativeBalance)}`}>
            {formatEUR(lay.cumulativeBalance)}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title={`Commissioni ${MONTH_LABELS[month - 1]} ${year}`}>
          <p className="text-sm text-slate-500">
            Prelievi già nel mese: <strong>{formatEUR(commissionWithdrawalsMonth)}</strong>
          </p>
          <p className="mt-1 text-lg font-bold">
            Totale finale mese: {formatEUR(commissionFinal)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Formula: Fatt + Bonus + Fondo cassa − Prelievi
          </p>
        </Card>
        <Card title="Come funziona">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>
              <strong>Da Commissioni</strong>: scala il totale finale del mese in corso
            </li>
            <li>
              <strong>Da LAY</strong>: registra un’uscita e aggiorna il saldo cassa LAY
            </li>
            <li>La destinazione è sempre <strong>Contanti</strong></li>
          </ul>
        </Card>
      </div>

      <Card title="Nuovo prelievo (rapido)">
        <WithdrawalForm />
      </Card>

      <Card title={`Elenco prelievi ${year}`}>
        <WithdrawalsTable rows={withdrawalRows} />
      </Card>
    </div>
  );
}
