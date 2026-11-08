import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calcCustomerBalance, isSuspendedBalanceZero } from "@/lib/calculations";
import { openSuspendedTotals } from "@/lib/sospesi-period";
import { formatEUR } from "@/lib/format";
import { formatMovementDateTime } from "@/lib/timezone";
import { BalanceText, Card, KpiCard } from "@/components/ui";
import { getPostaAccount, getTrisAccount } from "@/lib/calculations-server";
import { DeleteLayButton } from "@/components/lay/delete-lay-button";
import { toNumber } from "@/lib/format";
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

  if (customer.systemKey === "TRIS") return <TrisAccountPage />;
  if (customer.systemKey === "POSTA") return <PostaAccountPage />;

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/clienti" className="text-sm text-accent hover:underline">
          ← Clienti
        </Link>
        <h1 className="text-[28px] font-bold tracking-tight">
          {customer.surname} {customer.name}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard title="Dare (periodo aperto)" value={totals.totalDare} />
        <KpiCard title="Avere (periodo aperto)" value={totals.totalAvere} />
        <KpiCard
          title={`Saldo · periodo ${customer.currentPeriod}`}
          value={totals.balance}
          perspective="customer"
          subtitle={`${totals.movementCount} movimenti aperti`}
        />
      </div>

      <Card title="Nuovo movimento">
        <SuspendedMovementForm customerId={customer.id} />
      </Card>

      <Card title="Movimenti">
        <p className="mb-3 text-[13px] text-muted">
          Quando Dare − Avere torna a 0, il periodo si chiude da solo e i contatori ripartono da zero.
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
                  <td colSpan={6} className="py-6 text-center text-muted">
                    Nessun movimento registrato
                  </td>
                </tr>
              ) : (
                sections.map(({ period, movements, periodTotals, isOpen }) => (
                  <Fragment key={`period-${period}`}>
                    <tr className={isOpen ? "bg-accent-soft" : "bg-[#F6F6F3]"}>
                      <td colSpan={6} className="py-2 text-sm font-semibold">
                        {isOpen ? (
                          <span className="text-accent-dark">
                            Periodo {period} (aperto) — Dare{" "}
                            {formatEUR(isSuspendedBalanceZero(periodTotals.balance) ? 0 : periodTotals.totalDare)} ·
                            Avere{" "}
                            {formatEUR(isSuspendedBalanceZero(periodTotals.balance) ? 0 : periodTotals.totalAvere)} ·
                            saldo {formatEUR(periodTotals.balance)}
                            {movements.length === 0 ? " · contatori azzerati" : ""}
                          </span>
                        ) : (
                          <span className="text-muted">
                            Periodo {period} chiuso · Dare {formatEUR(periodTotals.totalDare)} · Avere{" "}
                            {formatEUR(periodTotals.totalAvere)} · saldo 0
                          </span>
                        )}
                      </td>
                    </tr>
                    {movements.map((m) => (
                      <tr key={m.id} className={isOpen ? undefined : "opacity-80"}>
                        <td className="whitespace-nowrap">
                          {formatMovementDateTime(m.date, m.time, m.createdAt)}
                        </td>
                        <td className={m.movementType === "DARE" ? "font-semibold text-minus-dark" : "font-semibold text-plus"}>
                          {m.movementType === "DARE" ? "Dare" : "Avere"}
                        </td>
                        <td className="font-semibold">{formatEUR(m.amount)}</td>
                        <td>{m.description ?? "—"}</td>
                        <td>{m.createdBy.name}</td>
                        <td>
                          <DeleteSuspendedButton id={m.id} customerId={customer.id} />
                        </td>
                      </tr>
                    ))}
                    {isOpen && movements.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-3 text-center text-sm text-muted">
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

      <Card title="Anagrafica">
        <CustomerForm customer={customer} />
      </Card>
    </div>
  );
}

/** Conto fisso Tris: solo saldo e movimenti di denaro; le giocate stanno in Conti › Giocate Tris. */
async function TrisAccountPage() {
  const tris = await getTrisAccount();
  if (!tris.account) notFound();
  const account = tris.account;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/clienti" className="text-sm text-accent hover:underline">
          ← Clienti
        </Link>
        <h1 className="text-[28px] font-bold tracking-tight">Conto Tris</h1>
      </div>

      <section className="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-minus-line bg-minus-soft px-6 py-5">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-minus-dark">Saldo conto Tris (entra nel saldo sospesi)</span>
          <BalanceText value={tris.balance} perspective="tris" className="text-[30px]" />
          <span className="text-sm text-[#3F3F46]">
            Soldi: <BalanceText value={tris.moneyBalance} perspective="tris" className="!font-medium" /> · Giocate:{" "}
            <BalanceText value={tris.playsBalance} perspective="tris" className="!font-medium" />
          </span>
        </div>
        <Link
          href="/conti/tris"
          className="inline-flex min-h-11 items-center rounded-[10px] bg-ink px-5 font-semibold text-white hover:bg-black"
        >
          Vai alle giocate
        </Link>
      </section>

      <Card title="Registra soldi dati o ricevuti">
        <SuspendedMovementForm customerId={account.id} isTris />
      </Card>

      <Card title="Movimenti di denaro">
        <p className="mb-3 text-[13px] text-muted">
          <strong className="text-minus-dark">Dare</strong> = soldi dati al Tris, il debito scende ·{" "}
          <strong className="text-plus">Avere</strong> = soldi ricevuti dal Tris, il debito sale. Qui non ci sono periodi:
          il saldo è la somma di tutto.
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
              {tris.moves.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap">{formatMovementDateTime(m.date, m.time, m.createdAt)}</td>
                  <td className={m.movementType === "DARE" ? "font-semibold text-minus-dark" : "font-semibold text-plus"}>
                    {m.movementType === "DARE" ? "Dare" : "Avere"}
                  </td>
                  <td className="font-semibold">{formatEUR(m.amount)}</td>
                  <td>{m.description ?? "—"}</td>
                  <td>{m.createdBy.name}</td>
                  <td>
                    {m.id !== "tris-saldo-iniziale" && <DeleteSuspendedButton id={m.id} customerId={account.id} />}
                  </td>
                </tr>
              ))}
              {tris.moves.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted">
                    Nessun movimento di denaro
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

/** Conto fisso Posta: specchio della cassa LAY. Depositi e prelievi diventano movimenti LAY. */
async function PostaAccountPage() {
  const posta = await getPostaAccount();
  if (!posta.account) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/clienti" className="text-sm text-accent hover:underline">
          ← Clienti
        </Link>
        <h1 className="text-[28px] font-bold tracking-tight">Conto Posta</h1>
      </div>

      <section className="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-line bg-white px-6 py-5">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-muted">Cassa LAY</span>
          <BalanceText value={posta.balance} perspective="posta" className="text-[30px]" />
          <span className="text-sm text-[#3F3F46]">
            Il saldo LAY è {formatEUR(posta.layBalance)}. Ogni deposito o prelievo che registri qui aggiorna il LAY.
          </span>
        </div>
        <Link href="/conti" className="inline-flex min-h-11 items-center rounded-[10px] bg-ink px-5 font-semibold text-white hover:bg-black">
          Vai al LAY
        </Link>
      </section>

      <Card title="Registra deposito o prelievo">
        <SuspendedMovementForm customerId={posta.account.id} isPosta />
      </Card>

      <Card title="Depositi e prelievi">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data / ora</th>
                <th>Tipo</th>
                <th>Importo</th>
                <th>Note</th>
                <th>Utente</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {posta.moves.map((m) => {
                const deposit = toNumber(m.amount) >= 0;
                return (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap">{formatMovementDateTime(m.date, m.time, m.createdAt)}</td>
                    <td className={deposit ? "font-semibold text-plus" : "font-semibold text-minus-dark"}>
                      {deposit ? "Avere · deposito" : "Dare · prelievo"}
                    </td>
                    <td className="font-semibold">{formatEUR(Math.abs(toNumber(m.amount)))}</td>
                    <td>{m.notes ?? "—"}</td>
                    <td>{m.createdBy.name}</td>
                    <td>
                      <DeleteLayButton id={m.id} />
                    </td>
                  </tr>
                );
              })}
              {posta.moves.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted">
                    Nessun deposito o prelievo ancora
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
