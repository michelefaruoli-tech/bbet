import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calcCustomerBalance } from "@/lib/calculations";
import { formatEUR, amountClass } from "@/lib/format";
import { formatDateIT } from "@/lib/timezone";
import { Card, Button } from "@/components/ui";
import { CustomerForm } from "@/components/sospesi/customer-form";
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
  last: { date: Date } | undefined;
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
          <td>{last ? formatDateIT(last.date) : "—"}</td>
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

  const customers = await prisma.customer.findMany({
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
      movements: { where: { deletedAt: null }, orderBy: { date: "desc" } },
    },
    orderBy: [{ surname: "asc" }, { name: "asc" }],
  });

  let totalPositive = 0;
  let totalNegative = 0;
  let netTotal = 0;

  const rows: Row[] = customers.map((c) => {
    const totals = calcCustomerBalance(c.movements);
    if (totals.balance > 0) totalPositive += totals.balance;
    if (totals.balance < 0) totalNegative += totals.balance;
    netTotal += totals.balance;
    const last = c.movements[0];
    return { customer: c, totals, last };
  });

  const withBalance = rows.filter((r) => r.totals.balance !== 0).sort(byAlphabet);
  const zeroBalance = rows.filter((r) => r.totals.balance === 0).sort(byAlphabet);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sospesi</h1>
          <p className="text-sm text-slate-500">
            In alto saldi aperti · sotto saldo 0 · ordine alfabetico · inserimento rapido
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

      <Card title="Nuovo cliente" action={<span className="text-xs text-slate-400">Compila e salva</span>}>
        <CustomerForm />
      </Card>

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
                <th>Dare</th>
                <th>Avere</th>
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
                  Saldo 0 — {zeroBalance.length} clienti · ordine alfabetico
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
                    Nessun cliente. Crea il primo cliente sopra oppure importa lo storico.
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
