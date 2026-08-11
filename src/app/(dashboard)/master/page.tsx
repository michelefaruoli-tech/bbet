import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calcMasterBalance } from "@/lib/calculations";
import { formatEUR, amountClass, toNumber } from "@/lib/format";
import { formatDateIT } from "@/lib/timezone";
import { Card } from "@/components/ui";
import { QuickMasterRow } from "@/components/master/quick-master-row";
import {
  MasterRecentTransactionsTable,
  type MasterMovementRow,
} from "@/components/master/master-movements-table";

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

  function toMasterRow(m: (typeof movements)[0]): MasterMovementRow {
    const amount = toNumber(m.amount);
    return {
      id: m.id,
      dateLabel: `${formatDateIT(m.date)}${m.time ? ` ${m.time}` : ""}`,
      tipo: amount > 0 ? "Avere" : amount < 0 ? "Dare" : m.movementType,
      movementType: m.movementType,
      amount,
      amountLabel: formatEUR(Math.abs(amount)),
      description: m.description ?? "—",
      notes: m.notes,
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Master</h1>
          <p className="text-sm text-slate-500">
            Positivo = Master deve a noi · Negativo = noi dobbiamo a loro · Avere (+) / Dare (−)
          </p>
        </div>
        <a href="/api/export/master" className="text-sm text-emerald-600 hover:underline">
          Esporta CSV
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card title="Totale Avere (+)">
          <p className="text-xl font-bold text-emerald-600">{formatEUR(totalAvere)}</p>
          <p className="mt-1 text-xs text-slate-400">Master deve a noi</p>
        </Card>
        <Card title="Totale Dare (−)">
          <p className="text-xl font-bold text-red-600">{formatEUR(totalDare)}</p>
          <p className="mt-1 text-xs text-slate-400">Noi a loro</p>
        </Card>
        <Card title="Saldo Master">
          <p className={`text-xl font-bold ${amountClass(balance)}`}>{formatEUR(balance)}</p>
          <p className="mt-1 text-xs text-slate-400">
            {balance > 0 ? "Loro devono a noi" : balance < 0 ? "Noi dobbiamo a loro" : "In pari"}
          </p>
        </Card>
        <Card title="Nel Rendiconto">
          <p className={`text-xl font-bold ${amountClass(balance)}`}>{formatEUR(balance)}</p>
          <p className="mt-1 text-xs text-slate-400">Entra così com’è (stesso segno)</p>
        </Card>
      </div>

      <Card title="Conto Master">
        <p className="mb-3 text-sm text-slate-500">
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
                  <span className="text-xs text-slate-500">Conto unico</span>
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
                    href="/master/scheda"
                    className="text-emerald-600 hover:underline text-sm whitespace-nowrap"
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
        <MasterRecentTransactionsTable rows={lastFive.map(toMasterRow)} />
        <p className="mt-3 text-sm">
          <Link href="/master/scheda" className="text-emerald-600 hover:underline">
            Vedi tutta la cronologia →
          </Link>
        </p>
      </Card>
    </div>
  );
}
