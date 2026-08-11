import { prisma } from "@/lib/prisma";
import { isSuspendedBalanceZero } from "@/lib/calculations";
import { openSuspendedTotals } from "@/lib/sospesi-period";
import { formatEUR, amountClass } from "@/lib/format";
import { formatMovementDateTime } from "@/lib/timezone";import { Card, Button } from "@/components/ui";
import { NewCustomerPanel } from "@/components/sospesi/new-customer-panel";
import {
  SospesiCustomersTable,
  type SospesiCustomerRow,
} from "@/components/sospesi/sospesi-customers-table";
import {
  SospesiRecentMovementsTable,
  type SospesiRecentMovementRow,
} from "@/components/sospesi/sospesi-recent-movements-table";

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

export default async function SospesiPage({  searchParams,
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

  const customerTableRows: SospesiCustomerRow[] = [...withBalance, ...zeroBalance].map(
    ({ customer, totals, last }) => ({
      id: customer.id,
      name: customer.name,
      surname: customer.surname,
      active: customer.active,
      section: isSuspendedBalanceZero(totals.balance) ? "zero" : "aperto",
      totalDare: totals.totalDare,
      totalAvere: totals.totalAvere,
      balance: totals.balance,
      movementCount: totals.movementCount,
      lastLabel: last ? formatMovementDateTime(last.date, last.time, last.createdAt) : "—",
    }),
  );

  const recentTableRows: SospesiRecentMovementRow[] = last10.map((m) => ({
    id: m.id,
    customerId: m.customer.id,
    customerLabel: `${m.customer.surname} ${m.customer.name}`,
    dateTimeLabel: formatMovementDateTime(m.date, m.time, m.createdAt),
    tipo: m.movementType === "DARE" ? "Inviati" : "Ricevuti",
    amount: Number(m.amount),
    amountLabel: formatEUR(m.amount),
    description: m.description ?? "—",
  }));

  return (    <div className="space-y-6">
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

        <SospesiCustomersTable rows={customerTableRows} />
      </Card>

      <Card title="Ultimi 10 movimenti">
        <SospesiRecentMovementsTable rows={recentTableRows} />
      </Card>    </div>
  );
}
