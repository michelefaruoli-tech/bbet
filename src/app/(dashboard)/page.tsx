import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getFullDashboard } from "@/lib/calculations-server";
import { formatEUR, toNumber } from "@/lib/format";
import { formatDateIT, TIMEZONE } from "@/lib/timezone";
import { formatInTimeZone } from "date-fns-tz";
import { it } from "date-fns/locale";
import { BalanceText, KpiCard, SignedAmount, quadratureWords } from "@/components/ui";
import { cn } from "@/lib/cn";
import { SECTIONS, type SectionKey } from "@/components/layout/sections";

export const dynamic = "force-dynamic";

type Recent = {
  id: string;
  at: Date;
  kind: string;
  section: SectionKey;
  label: string;
  amount: React.ReactNode;
  href: string;
};

function daysAgo(d: Date | null) {
  if (!d) return "—";
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "oggi";
  if (days === 1) return "ieri";
  return `fermo da ${days} giorni`;
}

export default async function OggiPage() {
  const now = new Date();
  const data = await getFullDashboard();
  const s = data.statement;
  const q = quadratureWords(s.difference);

  const [susp, lay, plays, master, withdrawals, lastSnapshot] = await Promise.all([
    prisma.suspendedMovement.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { customer: { select: { id: true, name: true, surname: true, systemKey: true } } },
    }),
    prisma.layMovement.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.trisPlay.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.masterMovement.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.withdrawal.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.financialStatementSnapshot.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);

  const recent: Recent[] = [
    ...susp.map((m) => ({
      id: `s-${m.id}`,
      at: m.createdAt,
      kind: m.customer.systemKey ? "Tris" : "Cliente",
      section: (m.customer.systemKey ? "tris" : "clienti") as SectionKey,
      label: `${m.customer.systemKey ? "Conto Tris" : `${m.customer.surname} ${m.customer.name}`.trim()} · ${
        m.movementType === "DARE" ? "Dare" : "Avere"
      }`,
      amount: <span className="font-semibold tnum">{formatEUR(m.amount)}</span>,
      href: `/clienti/${m.customer.id}`,
    })),
    ...lay.map((m) => ({
      id: `l-${m.id}`,
      at: m.createdAt,
      kind: m.category === "POSTA" ? "Posta" : "LAY",
      section: (m.category === "POSTA" ? "posta" : "lay") as SectionKey,
      label:
        m.category === "POSTA"
          ? `${toNumber(m.amount) >= 0 ? "Deposito" : "Prelievo"}${m.notes ? ` · ${m.notes}` : ""}`
          : m.notes || m.description || "Movimento LAY",
      amount: <SignedAmount value={toNumber(m.amount)} />,
      href: m.category === "POSTA" ? "/clienti/posta-conto-fisso" : "/conti",
    })),
    ...plays.map((p) => ({
      id: `t-${p.id}`,
      at: p.createdAt,
      kind: "Giocata Tris",
      section: "tris" as SectionKey,
      label: `${p.playType === "DARE" ? "Dare" : "Avere"}${p.notes ? ` · ${p.notes}` : ""}`,
      amount: <span className="font-semibold tnum">{formatEUR(p.amount)}</span>,
      href: "/conti/tris",
    })),
    ...master.map((m) => ({
      id: `m-${m.id}`,
      at: m.createdAt,
      kind: "Master",
      section: "master" as SectionKey,
      label: m.notes || m.description || m.movementType.toLowerCase(),
      amount: <SignedAmount value={toNumber(m.amount)} />,
      href: "/conti/master",
    })),
    ...withdrawals.map((w) => ({
      id: `w-${w.id}`,
      at: w.createdAt,
      kind: "Prelievo",
      section: "cassa" as SectionKey,
      label: w.description || w.destination || "Prelievo",
      amount: <SignedAmount value={-toNumber(w.amount)} />,
      href: "/cassa/prelievi",
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 7);

  const openClients = data.suspended.customerSummaries.filter((c) => Math.abs(c.balance) >= 0.005);
  const topClients = [...openClients].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)).slice(0, 5);

  const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
  const layMonth = data.lay.openMovements
    .filter((m) => {
      const d = new Date(m.date);
      return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}` === currentMonthKey;
    })
    .reduce((sum, m) => sum + toNumber(m.amount), 0);

  const lastPlay = data.suspended.tris.plays[0];
  const lastTrisMove = data.suspended.tris.moves[0];
  const lastTrisLabel = lastPlay
    ? `ultima giocata ${formatDateIT(lastPlay.date)}`
    : lastTrisMove
      ? `ultimo movimento ${formatDateIT(lastTrisMove.date)}`
      : "nessun movimento";

  const lastConta = lastSnapshot?.createdAt ?? data.lastUpdate;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium capitalize text-muted">
            {formatInTimeZone(now, TIMEZONE, "EEEE d MMMM yyyy", { locale: it })}
          </p>
          <h1 className="text-[28px] font-bold tracking-tight">Oggi</h1>
        </div>
        <p className="text-[13px] font-medium text-muted">
          Ultima conta di cassa: {lastConta ? formatDateIT(lastConta) : "mai"}
        </p>
      </header>

      <section
        className={cn(
          "flex flex-wrap items-center justify-between gap-6 rounded-xl border p-7",
          q.tone === "ok" && "border-accent bg-accent-soft",
          q.tone === "warn" && "border-minus-line bg-minus-soft",
          q.tone === "plus" && "border-plus-line bg-plus-soft",
        )}
      >
        <div className="flex flex-col gap-2">
          <span
            className={cn(
              "text-[13px] font-medium",
              q.tone === "ok" && "text-accent-dark",
              q.tone === "warn" && "text-minus-dark",
              q.tone === "plus" && "text-plus",
            )}
          >
            I conti tornano?
          </span>
          <h2
            className={cn(
              "text-[40px] font-bold leading-tight tracking-tight tnum",
              q.tone === "ok" && "text-accent-dark",
              q.tone === "warn" && "text-minus-dark",
              q.tone === "plus" && "text-plus",
            )}
          >
            {q.title}
          </h2>
          <p className="text-[15px] text-ink-soft tnum">
            Fondo cassa {formatEUR(data.cashFund)} · Quello che risulta {formatEUR(s.calculatedTotal)}
          </p>
        </div>
        <Link
          href="/cassa/conta"
          className="inline-flex min-h-11 items-center rounded-[10px] bg-btn px-5 text-[15px] font-semibold text-white hover:bg-btn-hover"
        >
          Rifai la conta
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Clienti"
          section="clienti"
          value={data.suspended.clientsNet}
          perspective="customer"
          href="/clienti"
          subtitle={`${openClients.length} clienti aperti`}
        />
        <KpiCard
          title="LAY"
          section="lay"
          value={data.lay.cumulativeBalance}
          perspective="lay"
          href="/conti"
          subtitle={`questo mese: ${layMonth >= 0 ? "+" : "−"}${formatEUR(Math.abs(layMonth))}`}
        />
        <KpiCard
          title="Tris · nei Sospesi"
          section="tris"
          value={data.suspended.trisBalance}
          perspective="tris"
          href="/conti/tris"
          subtitle={lastTrisLabel}
        />
        <KpiCard
          title="Master"
          section="master"
          value={data.master.balance}
          perspective="master"
          href="/conti/master"
          subtitle={data.master.movements[0] ? `ultimo: ${formatDateIT(data.master.movements[0].date)}` : undefined}
        />
      </section>

      <section className="flex flex-wrap gap-4">
        <div className="min-w-0 flex-[3_1_420px] rounded-xl border border-line bg-card px-6 py-5">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-base font-semibold">Ultimi movimenti</h3>
          </div>
          {recent.length === 0 && <p className="py-3 text-sm text-muted">Nessun movimento ancora.</p>}
          {recent.map((r) => (
            <Link
              key={r.id}
              href={r.href}
              className="flex items-center justify-between gap-3 border-t border-line-soft py-3 text-sm hover:bg-accent-soft"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                    SECTIONS[r.section].soft,
                    SECTIONS[r.section].text,
                  )}
                >
                  {r.kind}
                </span>
                <span className="truncate">{r.label}</span>
              </span>
              {r.amount}
            </Link>
          ))}
        </div>
        <div className="min-w-0 flex-[2_1_300px] rounded-xl border border-line bg-card px-6 py-5">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-base font-semibold">Clienti con saldo più alto</h3>
            <Link href="/clienti" className="text-sm text-accent hover:underline">
              Tutti
            </Link>
          </div>
          {topClients.length === 0 && <p className="py-3 text-sm text-muted">Tutti i clienti sono in pari.</p>}
          {topClients.map((c) => (
            <Link
              key={c.customer.id}
              href={`/clienti/${c.customer.id}`}
              className="flex items-center justify-between gap-3 border-t border-line-soft py-3 text-sm hover:bg-accent-soft"
            >
              <span>
                {c.customer.surname} {c.customer.name}
                <br />
                <span className="text-[13px] text-muted">{daysAgo(c.lastMovementAt)}</span>
              </span>
              <BalanceText value={c.balance} />
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-8 rounded-xl border border-line bg-card px-6 py-5 tnum">
        <div>
          <span className="text-[13px] font-medium text-muted">Commissioni {data.commissionYear.year}</span>
          <div className="text-xl font-bold">{formatEUR(data.commissionYear.commissioniAnnuali)}</div>
        </div>
        <div>
          <span className="text-[13px] font-medium text-muted">+ Fondo cassa</span>
          <div className="text-xl font-bold">{formatEUR(data.commissionYear.cashFund)}</div>
        </div>
        <div>
          <span className="text-[13px] font-medium text-muted">− Prelievi</span>
          <div className="text-xl font-bold">{formatEUR(data.commissionYear.withdrawals)}</div>
        </div>
        <div>
          <span className="text-[13px] font-medium text-muted">= Fondo cassa oggi</span>
          <div className="text-xl font-bold">{formatEUR(data.cashFund)}</div>
        </div>
        <Link href="/cassa" className="ml-auto text-sm text-accent hover:underline">
          Apri Cassa
        </Link>
      </section>
    </>
  );
}
