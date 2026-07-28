import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calcCustomerBalance } from "@/lib/calculations";
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

  const totals = calcCustomerBalance(customer.movements);

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
        <Card title="Totale Inviati">
          <p className="text-xl font-bold">{formatEUR(totals.totalDare)}</p>
        </Card>
        <Card title="Totale Ricevuti">
          <p className="text-xl font-bold">{formatEUR(totals.totalAvere)}</p>
        </Card>
        <Card title="Saldo attuale">
          <p className={`text-xl font-bold ${amountClass(totals.balance)}`}>{formatEUR(totals.balance)}</p>
        </Card>
        <Card title="Movimenti"><p className="text-xl font-bold">{totals.movementCount}</p></Card>
      </div>

      <Card title="Anagrafica cliente">
        <CustomerForm customer={customer} />
      </Card>

      <Card title="Nuovo movimento">
        <SuspendedMovementForm customerId={customer.id} />
      </Card>

      <Card title="Cronologia Inviati / Ricevuti">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Importo</th>
                <th>Descrizione</th>
                <th>Utente</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customer.movements.map((m) => (
                <tr key={m.id}>
                  <td>{formatDateIT(m.date)}{m.time ? ` ${m.time}` : ""}</td>
                  <td>{m.movementType === "DARE" ? "Inviati" : "Ricevuti"}</td>
                  <td className={amountClass(Number(m.amount))}>{formatEUR(m.amount)}</td>
                  <td>{m.description ?? "—"}</td>
                  <td>{m.createdBy.name}</td>
                  <td>
                    <DeleteSuspendedButton id={m.id} customerId={customer.id} />
                  </td>
                </tr>
              ))}
              {customer.movements.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    Nessun movimento registrato
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
