import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calcCustomerBalance, isSuspendedBalanceZero } from "@/lib/calculations";
import { openSuspendedTotals } from "@/lib/sospesi-period";
import { formatEUR, amountClass } from "@/lib/format";
import { formatMovementDateTime } from "@/lib/timezone";
import { Card } from "@/components/ui";
import { CustomerForm } from "@/components/sospesi/customer-form";
import { SuspendedMovementForm } from "@/components/sospesi/suspended-movement-form";
import {
  SuspendedMovementsTable,
  type SuspendedMovementRow,
} from "@/components/sospesi/suspended-movements-table";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await prisma.customer.findFirst({
    where: { id, deletedAt: null },
    include: {
      movements: {
        where: { deletedAt: null },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: { createdBy: { select: { name: true } } },
      },
    },
  });

  if (!customer) notFound();

  // KPI = solo periodo aperto; a saldo 0 i contatori sono azzerati
  const totals = openSuspendedTotals(customer.currentPeriod, customer.movements);

  const closedPeriods = [...new Set(customer.movements.map((m) => m.period))]
    .filter((p) => p !== customer.currentPeriod)
    .sort((a, b) => b - a);

  const openRaw = customer.movements.filter((m) => m.period === customer.currentPeriod);
  const openRawTotals = calcCustomerBalance(openRaw);

  const sections = [
    {
      period: customer.currentPeriod,
      movements: openRaw,
      periodTotals: openRawTotals,
      isOpen: true as const,
    },
    ...closedPeriods.map((period) => {
      const movements = customer.movements.filter((m) => m.period === period);
      return {
        period,
        movements,
        periodTotals: calcCustomerBalance(movements),
        isOpen: false as const,
      };
    }),
  ];

  const movementTableRows: SuspendedMovementRow[] = sections.flatMap(
    ({ period, movements, periodTotals, isOpen }) =>
      movements.map((m) => ({
        id: m.id,
        customerId: customer.id,
        dateTimeLabel: formatMovementDateTime(m.date, m.time, m.createdAt),
        tipo: m.movementType === "DARE" ? "Inviati" : "Ricevuti",
        amount: Number(m.amount),
        amountLabel: formatEUR(m.amount),
        description: m.description ?? "—",
        userName: m.createdBy.name,
        periodLabel: isOpen
          ? `Periodo ${period} (aperto) — saldo ${formatEUR(periodTotals.balance)}`
          : `Periodo ${period} chiuso — saldo 0`,
        isOpenPeriod: isOpen,
      })),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/sospesi" className="text-sm text-emerald-600 hover:underline">
          ← Torna ai Sospesi
        </Link>
        <h1 className="text-2xl font-bold">
          {customer.surname} {customer.name}
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card title="Inviati (periodo aperto)">
          <p className="text-xl font-bold">{formatEUR(totals.totalDare)}</p>
        </Card>
        <Card title="Ricevuti (periodo aperto)">
          <p className="text-xl font-bold">{formatEUR(totals.totalAvere)}</p>
        </Card>
        <Card title="Saldo attuale">
          <p className={`text-xl font-bold ${amountClass(totals.balance)}`}>{formatEUR(totals.balance)}</p>
          <p className="mt-1 text-xs text-slate-400">Periodo {customer.currentPeriod}</p>
        </Card>
        <Card title="Movimenti aperti">
          <p className="text-xl font-bold">{totals.movementCount}</p>
        </Card>
      </div>

      <Card title="Anagrafica cliente">
        <CustomerForm customer={customer} />
      </Card>

      <Card title="Nuovo movimento">
        <SuspendedMovementForm customerId={customer.id} />
      </Card>

      <Card title="Cronologia Inviati / Ricevuti">
        <p className="mb-3 text-xs text-slate-500">
          Quando Inviati − Ricevuti torna a 0, il periodo si archivia e i contatori ripartono da zero.
          I numeri in alto riguardano solo il periodo aperto.
        </p>
        <SuspendedMovementsTable rows={movementTableRows} customerId={customer.id} />
      </Card>
    </div>
  );
}
