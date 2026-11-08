import { getFullDashboard } from "@/lib/calculations-server";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/format";
import { formatDateTimeIT } from "@/lib/timezone";
import { PageHeader, Tabs } from "@/components/ui";
import { CASSA_TABS } from "@/components/layout/sections";
import { ContaForm } from "@/components/rendiconto/conta-form";

export const dynamic = "force-dynamic";

export default async function ContaPage() {
  const data = await getFullDashboard();
  const current = await prisma.financialStatementCurrent.findUnique({ where: { id: "current" } });
  const s = data.statement;

  return (
    <>
      <PageHeader
        title="Conta di cassa"
        section="cassa"
        subtitle={`Una volta al mese, o quando vuoi: conti i soldi, il resto lo calcola l'app · ultima modifica ${
          current ? formatDateTimeIT(current.updatedAt) : "—"
        }`}
      >
        <Tabs items={CASSA_TABS} active="/cassa/conta" label="Sezioni cassa" />
      </PageHeader>

      <ContaForm
        defaults={{
          online: toNumber(current?.online),
          personalAccounts: toNumber(current?.personalAccounts),
          cash: toNumber(current?.cash),
          coins: toNumber(current?.coins),
          correction: toNumber(current?.manualCreditAdjustment),
          notes: current?.notes ?? "",
        }}
        auto={{
          suspended: s.suspendedCredit,
          clients: data.suspended.clientsNet,
          tris: data.suspended.trisBalance,
          master: s.master,
          lay: s.lay,
        }}
        cashFund={data.cashFund}
      />
    </>
  );
}
