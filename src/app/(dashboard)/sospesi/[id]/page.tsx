import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calcCustomerBalance, isSuspendedBalanceZero } from "@/lib/calculations";
import { openSuspendedTotals } from "@/lib/sospesi-period";
import { formatEUR, amountClass } from "@/lib/format";
import { formatDateIT } from "@/lib/timezone";
import { Card } from "@/components/ui";
import { CustomerForm } from "@/components/sospesi/customer-form";
import { SuspendedMovementForm } from "@/components/sospesi/suspended-movement-form";
import { DeleteSuspendedButton } from "@/components/sospesi/delete-suspended-button";

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
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data / ora</th>
                <th>Tipo</th>
                <th>Importo</th>
                <th>Descrizione</th>
                <th>Utente</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customer.movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    Nessun movimento registrato
                  </td>
                </tr>
              ) : (
                sections.map(({ period, movements, periodTotals, isOpen }) => (
                  <Fragment key={`period-${period}`}>
                    <tr className={isOpen ? "bg-emerald-50" : "bg-slate-100"}>
                      <td colSpan={6} className="py-2 text-sm font-semibold">
                        {isOpen ? (
                          <span className="text-emerald-800">
                            Periodo {period} (aperto) — Inviati{" "}
                            {formatEUR(isSuspendedBalanceZero(periodTotals.balance) ? 0 : periodTotals.totalDare)} ·
                            Ricevuti{" "}
                            {formatEUR(isSuspendedBalanceZero(periodTotals.balance) ? 0 : periodTotals.totalAvere)} ·
                            saldo {formatEUR(periodTotals.balance)}
                            {movements.length === 0 ? " · contatori azzerati" : ""}
                          </span>
                        ) : (
                          <span className="text-slate-600">
                            ── Periodo {period} chiuso ── Inviati {formatEUR(periodTotals.totalDare)} · Ricevuti{" "}
                            {formatEUR(periodTotals.totalAvere)} · saldo 0
                          </span>
                        )}
                      </td>
                    </tr>
                    {movements.map((m) => (
                      <tr key={m.id} className={isOpen ? undefined : "opacity-80"}>
                        <td>
                          {formatDateIT(m.date)}
                          {m.time ? ` ${m.time}` : ""}
                        </td>
                        <td>{m.movementType === "DARE" ? "Inviati" : "Ricevuti"}</td>
                        <td className={amountClass(Number(m.amount))}>{formatEUR(m.amount)}</td>
                        <td>{m.description ?? "—"}</td>
                        <td>{m.createdBy.name}</td>
                        <td>
                          <DeleteSuspendedButton id={m.id} customerId={customer.id} />
                        </td>
                      </tr>
                    ))}
                    {isOpen && movements.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-3 text-center text-slate-400 text-sm">
                          Contatori a zero — inserisci un nuovo movimento per ripartire
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
