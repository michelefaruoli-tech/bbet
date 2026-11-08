import { prisma } from "@/lib/prisma";
import { SectionIcon } from "@/components/layout/sections";
import { formatEUR, toNumber } from "@/lib/format";
import { calcCommissionCashBalance } from "@/lib/calculations";
import { getFullDashboard } from "@/lib/calculations-server";
import { Card, Tabs } from "@/components/ui";
import { CASSA_TABS } from "@/components/layout/sections";
import { CommissionTable } from "@/components/commissioni/commission-table";
import { CommissionHistory } from "@/components/commissioni/commission-history";
import { YearSelector } from "@/components/commissioni/year-selector";
import {
  CommissioniTotaleBreakdown,
  RendicontoVsCommissioni,
} from "@/components/rendiconto/rendiconto-vs-commissioni";

export default async function CommissioniPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const currentYear = new Date().getFullYear();

  const yearsWithData = await prisma.commissionMonth.findMany({
    where: {
      OR: [
        { invoiceAmount: { not: 0 } },
        { bonusAmount: { not: 0 } },
        { casinoGross: { not: 0 } },
        { sportNet: { not: 0 } },
        { withdrawals: { not: 0 } },
        { cashFund: { not: 0 } },
      ],
    },
    select: {
      year: true,
      invoiceAmount: true,
      bonusAmount: true,
      cashFund: true,
    },
    orderBy: { year: "desc" },
  });

  // Preferisci l'anno con Fatture/Bonus mensili (non solo Fondo o Prelievi).
  // Es. 2026 ha il riparto fondo ma i mesi con le transazioni sono nel 2024.
  const yearsWithMonthlyTx = [
    ...new Set(
      yearsWithData
        .filter(
          (m) => toNumber(m.invoiceAmount) !== 0 || toNumber(m.bonusAmount) !== 0,
        )
        .map((m) => m.year),
    ),
  ].sort((a, b) => b - a);

  const allDataYears = [...new Set(yearsWithData.map((y) => y.year))].sort((a, b) => b - a);
  const defaultYear = yearsWithMonthlyTx[0] ?? allDataYears[0] ?? currentYear;
  const year = params.year ? Number(params.year) : defaultYear;

  const [existingMonths, history, dashboard] = await Promise.all([
    prisma.commissionMonth.findMany({
      where: { year },
      orderBy: { month: "asc" },
    }),
    prisma.auditLog.findMany({
      where: { entityType: "CommissionMonth" },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { user: { select: { name: true } } },
    }),
    getFullDashboard(),
  ]);

  const monthMap = new Map(existingMonths.map((m) => [m.month, m]));
  const allMonths = [];
  for (let month = 1; month <= 12; month++) {
    const existing = monthMap.get(month);
    if (existing) {
      allMonths.push(existing);
    } else {
      const created = await prisma.commissionMonth.create({ data: { year, month } });
      allMonths.push(created);
    }
  }

  // Prisma usa Decimal: convertiamo in numeri prima di passarli al Client Component.
  const tableMonths = allMonths.map((m) => ({
    id: m.id,
    month: m.month,
    invoiceAmount: toNumber(m.invoiceAmount),
    bonusAmount: toNumber(m.bonusAmount),
    casinoGross: toNumber(m.casinoGross),
    sportNet: toNumber(m.sportNet),
    withdrawals: toNumber(m.withdrawals),
    cashFund: toNumber(m.cashFund),
    closed: m.closed,
  }));

  const yearSet = new Set(allDataYears);
  for (let y = currentYear - 2; y <= currentYear + 1; y++) yearSet.add(y);
  const yearOptions = Array.from(yearSet).sort((a, b) => b - a);

  const hasData = allMonths.some(
    (m) =>
      toNumber(m.invoiceAmount) !== 0 ||
      toNumber(m.bonusAmount) !== 0 ||
      toNumber(m.casinoGross) !== 0 ||
      toNumber(m.sportNet) !== 0 ||
      toNumber(m.withdrawals) !== 0 ||
      toNumber(m.cashFund) !== 0,
  );
  const latestDataYear = yearsWithMonthlyTx[0] ?? allDataYears[0];

  const totFatt = allMonths.reduce((s, m) => s + toNumber(m.invoiceAmount), 0);
  const totBonus = allMonths.reduce((s, m) => s + toNumber(m.bonusAmount), 0);
  const totCommissioni = Math.round((totFatt + totBonus + Number.EPSILON) * 100) / 100;
  // Fondo cassa = chiusura annuale anno precedente (es. 4400), resta fisso
  const totFondo = allMonths.reduce((s, m) => s + toNumber(m.cashFund), 0);
  const totPrelievi = allMonths.reduce((s, m) => s + toNumber(m.withdrawals), 0);
  // Totale da Commissioni = Commissioni + Fondo − Prelievi
  const totaleDaCommissioni = calcCommissionCashBalance({
    invoiceTotal: totFatt,
    bonusTotal: totBonus,
    cashFundTotal: totFondo,
    withdrawalsTotal: totPrelievi,
  });

  const rendicontoTotale = dashboard.statement.calculatedTotal;
  const diffVsRendiconto =
    Math.round((totaleDaCommissioni - rendicontoTotale + Number.EPSILON) * 100) / 100;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-[28px] font-bold tracking-tight">
            <SectionIcon section="cassa" />
            Commissioni {year}
          </h1>
          <p className="text-sm text-muted">
            Totale = Commissioni annuali + Fondo cassa (chiusura anno prima) − Prelievi
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <YearSelector year={year} years={yearOptions} />
          <Tabs items={CASSA_TABS} active="/cassa" label="Sezioni cassa" />
        </div>
      </div>

      <CommissioniTotaleBreakdown
        year={year}
        commissioniAnnuali={totCommissioni}
        fondoCassa={totFondo}
        prelievi={totPrelievi}
        totale={totaleDaCommissioni}
      />

      <RendicontoVsCommissioni
        rendicontoTotal={rendicontoTotale}
        commissioniSaldo={totaleDaCommissioni}
        difference={diffVsRendiconto}
        breakdown={{
          commissioniAnnuali: totCommissioni,
          fondoCassa: totFondo,
          prelievi: totPrelievi,
        }}
        size="md"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="Fatture">
          <p className="text-xl font-bold">{formatEUR(totFatt)}</p>
        </Card>
        <Card title="Bonus">
          <p className="text-xl font-bold">{formatEUR(totBonus)}</p>
        </Card>
        <Card title="Fondo cassa (fisso)">
          <p className="text-xl font-bold">{formatEUR(totFondo)}</p>
          <p className="mt-1 text-xs text-muted">Chiusura anno precedente</p>
        </Card>
      </div>

      <Card title={`BBET ${year}`}>
        {(!hasData || (totFatt === 0 && totBonus === 0)) &&
          latestDataYear &&
          latestDataYear !== year && (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Stai guardando il {year}: qui non ci sono Fatture/Bonus mensili. Le transazioni per mese
            sono nel{" "}
            <a href={`/commissioni?year=${latestDataYear}`} className="font-semibold underline">
              {latestDataYear}
            </a>
            .
          </p>
        )}
        <CommissionTable key={year} year={year} months={tableMonths} />
      </Card>

      <CommissionHistory entries={history} />

      <p className="text-xs text-muted">
        <a href="/api/export/commissioni" className="text-accent hover:underline">
          Esporta CSV
        </a>
      </p>
    </div>
  );
}
