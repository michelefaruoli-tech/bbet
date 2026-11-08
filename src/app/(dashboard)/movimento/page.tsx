import { getPostaAccount, getSuspendedSummary } from "@/lib/calculations-server";
import { PageHeader } from "@/components/ui";
import { NewMovement } from "@/components/movimento/new-movement";

export const dynamic = "force-dynamic";

const KINDS = ["cliente", "tris", "lay", "master", "prelievo", "commissioni"] as const;

export default async function NuovoMovimentoPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const params = await searchParams;
  const [summary, posta] = await Promise.all([getSuspendedSummary(), getPostaAccount()]);
  const customers = [
    ...(summary.tris.account
      ? [{ id: summary.tris.account.id, label: "Tris (conto fisso)", balance: summary.trisBalance, isTris: true }]
      : []),
    ...(posta.account
      ? [{ id: posta.account.id, label: "Posta (cassa LAY)", balance: posta.balance, isTris: false, isPosta: true }]
      : []),
    ...summary.customerSummaries
      .map((c) => ({
        id: c.customer.id,
        label: `${c.customer.surname} ${c.customer.name}`.trim(),
        balance: c.balance,
        isTris: false,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "it", { sensitivity: "base" })),
  ];
  const initialKind = KINDS.find((k) => k === params.tipo) ?? "cliente";

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
      <PageHeader title="Nuovo movimento" />
      <NewMovement customers={customers} trisBalance={summary.trisBalance} initialKind={initialKind} />
    </div>
  );
}
