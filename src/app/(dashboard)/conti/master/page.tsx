import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calcMasterBalance } from "@/lib/calculations";
import { formatEUR, amountClass, toNumber } from "@/lib/format";
import { formatDateIT } from "@/lib/timezone";
import { BalanceText, Card, KpiCard, PageHeader, Tabs } from "@/components/ui";
import { CONTI_TABS } from "@/components/layout/sections";
import { QuickMasterRow } from "@/components/master/quick-master-row";
import { EditMasterNotes } from "@/components/master/edit-master-notes";

export default async function MasterPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const year = params.year ? Number(params.year) : new Date().getFullYear();

  const movements = await prisma.masterMovement.findMany({
    where: { deletedAt: null },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const balance = calcMasterBalance(movements);
  // Avere = operazioni positive · Dare = operazioni negative
  const totalAvere = movements
    .filter((m) => toNumber(m.amount) > 0)
    .reduce((s, m) => s + toNumber(m.amount), 0);
  const totalDare = movements
    .filter((m) => toNumber(m.amount) < 0)
    .reduce((s, m) => s + Math.abs(toNumber(m.amount)), 0);
  const yearMovements = movements.filter((m) => new Date(m.date).getFullYear() === year);
  const monthMovements = movements.filter((m) => {
    const d = new Date(m.date);
    return d.getFullYear() === year && d.getMonth() === new Date().getMonth();
  });
  const last = movements[0];
  const lastFive = movements.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Conti">
        <Tabs items={CONTI_TABS} active="/conti/master" label="Scegli conto" />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard title="Saldo Master" value={balance} perspective="master" subtitle="entra così com’è nella conta di cassa" />
        <KpiCard title="Totale Avere (+)" value={totalAvere} subtitle="pagamenti: Master deve a te" />
        <KpiCard title="Totale Dare (−)" value={totalDare} subtitle="ricariche e bonus: tu devi a Master" />
      </div>
      <p className="text-[13px] text-muted">
        Ora: <BalanceText value={balance} perspective="master" /> ·{" "}
        <a href="/api/export/master" className="text-accent hover:underline">
          Esporta CSV
        </a>
      </p>

      <Card title="Conto Master">
        <p className="mb-3 text-sm text-muted">
          Mese corrente: {monthMovements.length} movimenti · Anno {year}: {yearMovements.length}{" "}
          movimenti · Totale storico: {movements.length}
        </p>
        <div className="overflow-x-auto">
          <table className="data-table sospesi-table">
            <thead>
              <tr>
                <th>Conto</th>
                <th>Avere (+)</th>
                <th>Dare (−)</th>
                <th>Saldo</th>
                <th>Mov.</th>
                <th>Ultimo</th>
                <th>Inserimento rapido</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr className="sospesi-row sospesi-row-even">
                <td>
                  <div className="font-medium">Master</div>
                  <span className="text-xs text-muted">Conto unico</span>
                </td>
                <td>{formatEUR(totalAvere)}</td>
                <td>{formatEUR(totalDare)}</td>
                <td className={amountClass(balance)}>{formatEUR(balance)}</td>
                <td>{movements.length}</td>
                <td>{last ? formatDateIT(last.date) : "—"}</td>
                <td>
                  <QuickMasterRow />
                </td>
                <td>
                  <Link
                    href="/conti/master/scheda"
                    className="text-accent hover:underline text-sm whitespace-nowrap"
                  >
                    Scheda
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Ultime 5 transazioni">
        <div className="overflow-x-auto">
          <table className="data-table sospesi-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Importo</th>
                <th>Descrizione</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {lastFive.map((m, i) => {
                const amount = toNumber(m.amount);
                const tipo = amount > 0 ? "Avere" : amount < 0 ? "Dare" : m.movementType;
                return (
                  <tr
                    key={m.id}
                    className={`sospesi-row ${i % 2 === 0 ? "sospesi-row-even" : "sospesi-row-odd"}`}
                  >
                    <td>
                      {formatDateIT(m.date)}
                      {m.time ? ` ${m.time}` : ""}
                    </td>
                    <td className={amountClass(amount)}>{tipo}</td>
                    <td className={amountClass(amount)}>{formatEUR(Math.abs(amount))}</td>
                    <td>{m.description ?? "—"}</td>
                    <td>
                      <EditMasterNotes id={m.id} initialNotes={m.notes} />
                    </td>
                  </tr>
                );
              })}
              {lastFive.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted">
                    Nessuna transazione ancora
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm">
          <Link href="/conti/master/scheda" className="text-accent hover:underline">
            Vedi tutta la cronologia →
          </Link>
        </p>
      </Card>
    </div>
  );
}
