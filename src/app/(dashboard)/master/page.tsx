import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calcMasterBalance } from "@/lib/calculations";
import { formatEUR, amountClass, toNumber } from "@/lib/format";
import { formatDateIT } from "@/lib/timezone";
import { Card } from "@/components/ui";
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
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    Nessuna transazione ancora
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm">
          <Link href="/master/scheda" className="text-emerald-600 hover:underline">
            Vedi tutta la cronologia →
          </Link>
        </p>
      </Card>
    </div>
  );
}
