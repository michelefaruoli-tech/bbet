import { prisma } from "@/lib/prisma";
import { getLaySummary } from "@/lib/calculations-server";
import { formatEUR, amountClass, toNumber } from "@/lib/format";
import { formatDateIT } from "@/lib/timezone";
import { Card, Tabs } from "@/components/ui";
import { CASSA_TABS } from "@/components/layout/sections";
import { WithdrawalForm } from "@/components/prelievi/withdrawal-form";
import { DeleteWithdrawalButton } from "@/components/prelievi/delete-withdrawal-button";

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Prelievi</h1>
          <p className="text-sm text-muted">
            Solo da Commissioni o LAY · sempre in contanti · aggiorna i saldi automaticamente
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a href="/api/export/prelievi" className="text-sm text-accent hover:underline">
            Esporta CSV
          </a>
          <Tabs items={CASSA_TABS} active="/cassa/prelievi" label="Sezioni cassa" />
        </div>
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
          <p className="text-sm text-muted">
            Prelievi già nel mese: <strong>{formatEUR(commissionWithdrawalsMonth)}</strong>
          </p>
          <p className="mt-1 text-lg font-bold">
            Totale finale mese: {formatEUR(commissionFinal)}
          </p>
          <p className="mt-1 text-xs text-muted">
            Formula: Fatt + Bonus + Fondo cassa − Prelievi
          </p>
        </Card>
        <Card title="Come funziona">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
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
        <div className="overflow-x-auto">
          <table className="data-table sospesi-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Importo</th>
                <th>Da</th>
                <th>Destinazione</th>
                <th>Periodo</th>
                <th>Note</th>
                <th>Utente</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w, i) => (
                <tr
                  key={w.id}
                  className={`sospesi-row ${i % 2 === 0 ? "sospesi-row-even" : "sospesi-row-odd"}`}
                >
                  <td>{formatDateIT(w.date)}</td>
                  <td className="font-medium">{formatEUR(w.amount)}</td>
                  <td>
                    {w.source === "LAY" ? (
                      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-800">LAY</span>
                    ) : (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-accent-dark">
                        Commissioni
                      </span>
                    )}
                  </td>
                  <td>{w.destination ?? "Contanti"}</td>
                  <td>
                    {MONTH_LABELS[w.month - 1]} {w.year}
                  </td>
                  <td className="max-w-[12rem] truncate">{w.notes ?? w.description ?? "—"}</td>
                  <td>{w.createdBy.name}</td>
                  <td>
                    <DeleteWithdrawalButton id={w.id} />
                  </td>
                </tr>
              ))}
              {withdrawals.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-muted">
                    Nessun prelievo registrato quest’anno
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
