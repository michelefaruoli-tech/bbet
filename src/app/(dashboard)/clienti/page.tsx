import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isSuspendedBalanceZero } from "@/lib/calculations";
import { openSuspendedTotals } from "@/lib/sospesi-period";
import { getPostaAccount, getTrisAccount } from "@/lib/calculations-server";
import { formatMovementDateTime, formatDateIT } from "@/lib/timezone";
import { BalanceText, Badge, PageHeader } from "@/components/ui";
import { NewCustomerPanel } from "@/components/sospesi/new-customer-panel";
import { QuickSuspendedRow } from "@/components/sospesi/quick-suspended-row";
import { QuickPostaRow } from "@/components/sospesi/quick-posta-row";
import { cn } from "@/lib/cn";
import { toNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "aperti", label: "Aperti" },
  { key: "pari", label: "In pari" },
  { key: "archiviati", label: "Archiviati" },
  { key: "tutti", label: "Tutti" },
] as const;

export default async function ClientiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stato?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const stato = (FILTERS.find((f) => f.key === params.stato)?.key ?? "aperti") as (typeof FILTERS)[number]["key"];

  const [customers, tris, posta] = await Promise.all([
    prisma.customer.findMany({
      where: {
        deletedAt: null,
        systemKey: null,
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
    }),
    getTrisAccount(),
    getPostaAccount(),
  ]);

  const rows = customers.map((c) => {
    const totals = openSuspendedTotals(c.currentPeriod, c.movements);
    const last = c.movements[0];
    return { customer: c, totals, last };
  });

  const active = rows.filter((r) => r.customer.active);
  const open = active.filter((r) => !isSuspendedBalanceZero(r.totals.balance));
  const even = active.filter((r) => isSuspendedBalanceZero(r.totals.balance));
  const archived = rows.filter((r) => !r.customer.active);

  const clientsNet = active.reduce((s, r) => s + r.totals.balance, 0);
  const total = Math.round((clientsNet + tris.balance) * 100) / 100;

  const shown =
    stato === "aperti" ? open : stato === "pari" ? even : stato === "archiviati" ? archived : rows;
  const sorted = [...shown].sort((a, b) =>
    `${a.customer.surname} ${a.customer.name}`.localeCompare(`${b.customer.surname} ${b.customer.name}`, "it", {
      sensitivity: "base",
    }),
  );

  const counts: Record<string, number> = {
    aperti: open.length,
    pari: even.length,
    archiviati: archived.length,
    tutti: rows.length,
  };

  const lastTris = [
    ...tris.moves.map((m) => ({ at: m.createdAt, date: m.date, label: m.movementType === "DARE" ? "Dare" : "Avere" })),
    ...tris.plays.map((p) => ({ at: p.createdAt, date: p.date, label: `giocata ${p.playType === "DARE" ? "Dare" : "Avere"}` })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime())[0];

  return (
    <>
      <PageHeader
        title="Clienti"
        subtitle={
          <>
            Clienti: <BalanceText value={clientsNet} plural /> · Tris: <BalanceText value={tris.balance} perspective="tris" /> ·
            Saldo sospesi: <strong className="tnum text-ink">{total.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}</strong> ·
            Cassa LAY: <BalanceText value={posta.balance} perspective="posta" />
          </>
        }
      >
        <a href="/api/export/sospesi" className="text-sm text-accent hover:underline">
          Esporta CSV
        </a>
      </PageHeader>

      <NewCustomerPanel />

      <div className="flex flex-wrap items-center gap-3">
        <form className="flex flex-[1_1_280px] gap-2" role="search">
          <label htmlFor="q" className="sr-only">
            Cerca cliente
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Cerca per nome o telefono…"
            className="inp flex-1"
          />
          <input type="hidden" name="stato" value={stato} />
        </form>
        <nav aria-label="Filtra clienti" className="flex flex-wrap gap-1 rounded-[10px] bg-[#EDEDE8] p-1">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/clienti?stato=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              aria-current={stato === f.key ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 items-center rounded-lg px-3.5 text-sm font-semibold",
                stato === f.key ? "bg-ink text-white" : "text-muted hover:text-ink",
              )}
            >
              {f.label} ({counts[f.key]})
            </Link>
          ))}
        </nav>
      </div>

      <p className="text-[13px] text-muted">
        <strong className="text-minus-dark">Dare</strong> = hai dato soldi al cliente, il suo debito sale ·{" "}
        <strong className="text-plus">Avere</strong> = il cliente ti ha pagato, il debito scende. Quando torna a zero il
        periodo si chiude da solo.
      </p>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="data-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Saldo</th>
              <th>Ultimo movimento</th>
              <th className="!text-right">Registra</th>
            </tr>
          </thead>
          <tbody>
            {tris.account && !q && (
              <tr className="bg-minus-soft">
                <td>
                  <Link href={`/clienti/${tris.account.id}`} className="font-semibold hover:underline">
                    Tris
                  </Link>{" "}
                  <Badge tone="warn">CONTO FISSO</Badge>
                  <br />
                  <span className="text-[13px] text-muted">
                    qui solo saldo e soldi · le giocate sono in{" "}
                    <Link href="/conti/tris" className="text-accent hover:underline">
                      Giocate Tris
                    </Link>
                  </span>
                </td>
                <td>
                  <BalanceText value={tris.balance} perspective="tris" />
                </td>
                <td className="text-[13px] text-muted">
                  {lastTris ? `${formatDateIT(lastTris.date)} · ${lastTris.label}` : "—"}
                </td>
                <td>
                  <QuickSuspendedRow customerId={tris.account.id} name="Tris" />
                </td>
              </tr>
            )}
            {posta.account && !q && (
              <tr className="bg-[#F6F6F3]">
                <td>
                  <Link href={`/clienti/${posta.account.id}`} className="font-semibold hover:underline">
                    Posta
                  </Link>{" "}
                  <Badge>CONTO FISSO</Badge>
                  <br />
                  <span className="text-[13px] text-muted">
                    cassa LAY · qui depositi e prelievi ·{" "}
                    <Link href="/conti" className="text-accent hover:underline">
                      vai al LAY
                    </Link>
                  </span>
                </td>
                <td>
                  <BalanceText value={posta.balance} perspective="posta" />
                </td>
                <td className="text-[13px] text-muted">
                  {posta.moves[0]
                    ? `${formatDateIT(posta.moves[0].date)} · ${toNumber(posta.moves[0].amount) >= 0 ? "deposito" : "prelievo"}`
                    : "—"}
                </td>
                <td>
                  <QuickPostaRow />
                </td>
              </tr>
            )}
            {sorted.map(({ customer, totals, last }) => (
              <tr key={customer.id}>
                <td>
                  <Link href={`/clienti/${customer.id}`} className="font-semibold hover:underline">
                    {customer.surname} {customer.name}
                  </Link>
                  {customer.phone && <div className="text-[13px] text-muted">{customer.phone}</div>}
                  {!customer.active && <Badge>archiviato</Badge>}
                </td>
                <td>
                  <BalanceText value={totals.balance} />
                </td>
                <td className="whitespace-nowrap text-[13px] text-muted">
                  {last ? formatMovementDateTime(last.date, last.time, last.createdAt) : "—"}
                </td>
                <td>
                  <QuickSuspendedRow customerId={customer.id} name={`${customer.surname} ${customer.name}`} />
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-muted">
                  {q ? `Nessun cliente trovato per “${q}”` : "Nessun cliente in questo elenco"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
