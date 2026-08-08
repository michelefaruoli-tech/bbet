import { getFullDashboard } from "@/lib/calculations-server";
import { formatDateTimeIT } from "@/lib/timezone";
import { formatEUR, amountClass } from "@/lib/format";
import { KpiCard, Card } from "@/components/ui";
import { RendicontoVsCommissioni } from "@/components/rendiconto/rendiconto-vs-commissioni";

export default async function DashboardPage() {
  const data = await getFullDashboard();
  const cy = data.commissionYear;
  const diff = data.statement.difference;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Ultimo aggiornamento: {formatDateTimeIT(data.lastUpdate)}
        </p>
      </div>

      <RendicontoVsCommissioni
        rendicontoTotal={data.statement.calculatedTotal}
        commissioniSaldo={cy.totale}
        difference={diff}
        breakdown={{
          commissioniAnnuali: cy.commissioniAnnuali,
          fondoCassa: cy.cashFund,
          prelievi: cy.withdrawals,
        }}
        size="lg"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard title="Totale Sospesi" value={data.suspended.netTotal} href="/sospesi" />
        <KpiCard title="Saldo Master" value={data.master.balance} href="/master" />
        <KpiCard title="Saldo LAY" value={data.lay.cumulativeBalance} href="/lay" />
        <KpiCard title="Saldo Tris" value={data.lay.trisCumulative} href="/lay/tris" />
        <KpiCard
          title="Fondo cassa (fisso)"
          value={cy.cashFund}
          href={`/commissioni?year=${cy.year}`}
          subtitle={`Anno ${cy.year} · chiusura anno precedente`}
        />
        <KpiCard
          title="Totale Commissioni"
          value={cy.totale}
          href={`/commissioni?year=${cy.year}`}
          subtitle={`${cy.year}: Commissioni + Fondo − Prelievi`}
          highlight="ok"
        />
      </div>

      <Card title="Come entra nel Rendiconto (i 4 automatici)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            Credito sospeso:{" "}
            <span className="font-semibold">{formatEUR(data.statement.suspendedCredit)}</span>
            <span className="ml-1 text-xs text-slate-400">(così com’è)</span>
          </div>
          <div>
            Tris (contrario):{" "}
            <span className={`font-semibold ${amountClass(-data.statement.tris)}`}>
              {formatEUR(-data.statement.tris)}
            </span>
          </div>
          <div>
            Master:{" "}
            <span className="font-semibold">{formatEUR(data.statement.master)}</span>
            <span className="ml-1 text-xs text-slate-400">(così com’è)</span>
          </div>
          <div>
            LAY (−):{" "}
            <span className="font-semibold">{formatEUR(-data.lay.cumulativeBalance)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
