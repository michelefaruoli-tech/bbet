import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isSuspendedBalanceZero } from "@/lib/calculations";
import { openSuspendedTotals } from "@/lib/sospesi-period";
import { formatEUR, amountClass } from "@/lib/format";
import { formatMovementDateTime } from "@/lib/timezone";
import { Card, Button } from "@/components/ui";
import { NewCustomerPanel } from "@/components/sospesi/new-customer-panel";
import { QuickSuspendedRow } from "@/components/sospesi/quick-suspended-row";

type Row = {
  customer: {
    id: string;
    name: string;
    surname: string;
    active: boolean;
  };
  totals: {
    totalDare: number;
    totalAvere: number;
    balance: number;
    movementCount: number;
  };
  last: { date: Date; time: string | null; createdAt: Date } | undefined;
};

function byAlphabet(a: Row, b: Row) {
  const sa = `${a.customer.surname} ${a.customer.name}`.localeCompare(
    `${b.customer.surname} ${b.customer.name}`,
    "it",
    { sensitivity: "base" },
  );
  return sa;
}

function CustomerRows({ rows, stripeStart = 0 }: { rows: Row[]; stripeStart?: number }) {
  return (
    <>
      {rows.map(({ customer, totals, last }, i) => (
        <tr
          key={customer.id}
          className={`sospesi-row ${(stripeStart + i) % 2 === 0 ? "sospesi-row-even" : "sospesi-row-odd"}`}
        >
          <td>
            <div className="font-medium">
              {customer.surname} {customer.name}
            </div>
            {!customer.active && <span className="text-xs text-amber-600">Archiviato</span>}
          </td>
          <td>{formatEUR(totals.totalDare)}</td>
          <td>{formatEUR(totals.totalAvere)}</td>
          <td className={amountClass(totals.balance)}>{formatEUR(totals.balance)}</td>
          <td>{totals.movementCount}</td>
          <td className="whitespace-nowrap">
            {last ? formatMovementDateTime(last.date, last.time, last.createdAt) : "—"}
          </td>
          <td>
            <QuickSuspendedRow customerId={customer.id} />
          </td>
          <td>
            <Link
              href={`/sospesi/${customer.id}`}
              className="text-emerald-600 hover:underline text-sm whitespace-nowrap"
            >
              Scheda
            </Link>
          </td>
        </tr>
      ))}
    </>
  );
}

export default async function SospesiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stato?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const stato = params.stato ?? "attivi";

  const [customers, recentMovements] = await Promise.all([
    prisma.customer.findMany({
      where: {
        deletedAt: null,
        ...(stato === "archiviati" ? { active: false } : stato === "attivi" ? { active: true } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { surname: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
              ],
            }
          : {}),
      },
      include: {
        movements: {
          where: { deletedAt: null },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        },
      },
      orderBy: [{ surname: "asc" }, { name: "asc" }],
    }),
    prisma.suspendedMovement.findMany({
      where: { deletedAt: null },
      include: {
        customer: { select: { id: true, name: true, surname: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 40,
    }),
  ]);

  const last10 = [...recentMovements]
    .sort((a, b) => {
      const dateDiff = b.date.getTime() - a.date.getTime();
      if (dateDiff !== 0) return dateDiff;
      const timeA = a.time ?? "";
      const timeB = b.time ?? "";
      if (timeA !== timeB) return timeB.localeCompare(timeA);
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, 10);

  let totalPositive = 0;
  let totalNegative = 0;
  let netTotal = 0;

  const rows: Row[] = customers.map((c) => {
    const { openMovements, ...totals } = openSuspendedTotals(c.currentPeriod, c.movements);
    if (totals.balance > 0) totalPositive += totals.balance;
    if (totals.balance < 0) totalNegative += totals.balance;
    netTotal += totals.balance;

    const sortedOpen = [...openMovements].sort((a, b) => {
      const dateDiff = b.date.getTime() - a.date.getTime();
      if (dateDiff !== 0) return dateDiff;
      const timeCmp = (b.time ?? "").localeCompare(a.time ?? "");
      if (timeCmp !== 0) return timeCmp;
      return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
    });
    const last = sortedOpen[0]
      ? {
          date: sortedOpen[0].date,
          time: sortedOpen[0].time ?? null,
          createdAt: sortedOpen[0].createdAt ?? sortedOpen[0].date,
        }
      : undefined;

    return { customer: c, totals, last };
  });

  const withBalance = rows.filter((r) => !isSuspendedBalanceZero(r.totals.balance)).sort(byAlphabet);
  const zeroBalance = rows.filter((r) => isSuspendedBalanceZero(r.totals.balance)).sort(byAlphabet);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sospesi</h1>
          <p className="text-sm text-slate-500">
            Contatori del periodo aperto · a saldo 0 si archivia e si riparte da zero · ordine alfabetico
          </p>
        </div>
        <a href="/api/export/sospesi" className="text-sm text-emerald-600 hover:underline">
          Esporta CSV
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="Crediti positivi">
          <p className={`text-2xl font-bold ${amountClass(totalPositive)}`}>{formatEUR(totalPositive)}</p>
        </Card>
        <Card title="Saldi negativi">
          <p className={`text-2xl font-bold ${amountClass(totalNegative)}`}>{formatEUR(totalNegative)}</p>
        </Card>
        <Card title="Totale netto Sospesi">
          <p className={`text-2xl font-bold ${amountClass(netTotal)}`}>{formatEUR(netTotal)}</p>
          <p className="mt-1 text-xs text-slate-400">Alimenta il campo Credito del Rendiconto</p>
        </Card>
      </div>

      <NewCustomerPanel />

      <Card title="Clienti">
        <form className="mb-4 flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Cerca cliente..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select name="stato" defaultValue={stato} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="attivi">Attivi</option>
            <option value="archiviati">Archiviati</option>
            <option value="tutti">Tutti</option>
          </select>
          <Button type="submit" variant="secondary">
            Filtra
          </Button>
        </form>

        <div className="overflow-x-auto">
          <table className="data-table sospesi-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Inviati</th>
                <th>Ricevuti</th>
                <th>Saldo</th>
                <th>Mov.</th>
                <th>Ultimo</th>
                <th>Inserimento rapido</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr className="sospesi-section bg-emerald-50">
                <td colSpan={8} className="py-2 text-sm font-semibold text-emerald-800">
                  Saldi aperti (positivo o negativo) — {withBalance.length} clienti · ordine alfabetico
                </td>
              </tr>
              <CustomerRows rows={withBalance} />
              {withBalance.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-slate-400">
                    Nessun cliente con saldo aperto
                  </td>
                </tr>
              )}

              <tr className="sospesi-section bg-slate-100">
                <td colSpan={8} className="py-2 text-sm font-semibold text-slate-600">
                  Saldo 0 — {zeroBalance.length} clienti · contatori azzerati · ordine alfabetico
                </td>
              </tr>
              <CustomerRows rows={zeroBalance} />
              {zeroBalance.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-slate-400">
                    Nessun cliente a saldo 0
                  </td>
                </tr>
              )}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Nessun cliente. Usa “+ Nuovo cliente” oppure importa lo storico.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Ultimi 10 movimenti">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data / ora</th>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Importo</th>
                <th>Descrizione</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {last10.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap">
                    {formatMovementDateTime(m.date, m.time, m.createdAt)}
                  </td>
                  <td>
                    {m.customer.surname} {m.customer.name}
                  </td>
                  <td>{m.movementType === "DARE" ? "Inviati" : "Ricevuti"}</td>
                  <td className={amountClass(Number(m.amount))}>{formatEUR(m.amount)}</td>
                  <td>{m.description ?? "—"}</td>
                  <td>
                    <Link
                      href={`/sospesi/${m.customer.id}`}
                      className="text-sm text-emerald-600 hover:underline whitespace-nowrap"
                    >
                      Scheda
                    </Link>
                  </td>
                </tr>
              ))}
              {last10.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    Nessun movimento ancora
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
