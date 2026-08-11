import { getFullDashboard } from "@/lib/calculations-server";
import { prisma } from "@/lib/prisma";
import { formatEUR, amountClass, toNumber } from "@/lib/format";
import { formatDateIT, formatDateTimeIT } from "@/lib/timezone";
import { Card } from "@/components/ui";
import { RendicontoForm } from "@/components/rendiconto/rendiconto-form";
import { SnapshotButton } from "@/components/rendiconto/snapshot-button";
import { SnapshotTable, type SnapshotRow } from "@/components/rendiconto/snapshot-table";
import { RendicontoVsCommissioni } from "@/components/rendiconto/rendiconto-vs-commissioni";

export default async function RendicontoPage() {
  const data = await getFullDashboard();
  const current = await prisma.financialStatementCurrent.findUnique({ where: { id: "current" } });
  const snapshots = await prisma.financialStatementSnapshot.findMany({
    orderBy: { snapshotDate: "desc" },
    take: 20,
    include: { createdBy: { select: { name: true } } },
  });

  const s = data.statement;

  const snapshotRows: SnapshotRow[] = snapshots.map((snap) => ({
    id: snap.id,
    dateLabel: formatDateIT(snap.snapshotDate),
    calculatedLabel: formatEUR(snap.calculatedTotal),
    cashLabel: formatEUR(snap.cashTotal),
    differenceLabel: formatEUR(snap.difference),
    difference: toNumber(snap.difference),
    userName: snap.createdBy.name,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Rendiconto</h1>
          <p className="text-sm text-slate-500">
            Aggiornato: {current ? formatDateTimeIT(current.updatedAt) : "—"}
          </p>
        </div>
        <SnapshotButton />
      </div>

      <RendicontoVsCommissioni
        rendicontoTotal={s.calculatedTotal}
        commissioniSaldo={data.cashFund}
        difference={s.difference}
        breakdown={{
          commissioniAnnuali: data.commissionYear.commissioniAnnuali,
          fondoCassa: data.commissionYear.cashFund,
          prelievi: data.commissionYear.withdrawals,
        }}
        size="lg"
      />

      {/* —— BLOCCO 1: CAMPI MANUALI —— */}
      <Card title="1 · Campi manuali (li inserisci tu)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-sm">
          <ManualLine label="Online" value={s.online} />
          <ManualLine label="Credito ±" value={s.manualCreditAdjustment} />
          <ManualLine label="Conti personali" value={s.personalAccounts} />
          <ManualLine label="Contanti" value={s.cash} />
          <ManualLine label="Monete" value={s.coins} />
        </div>
        <div className="mt-4 rounded-lg border-2 border-sky-400 bg-sky-50 px-4 py-3">
          <p className="text-sm font-medium text-sky-800">Somma campi manuali</p>
          <p className={`text-2xl font-bold ${amountClass(s.manualSum)}`}>{formatEUR(s.manualSum)}</p>
          <p className="mt-1 text-xs text-sky-700">
            Online + Credito± + Conti personali + Contanti + Monete
          </p>
        </div>
      </Card>

      {/* —— BLOCCO 2: 4 AUTOMATICI —— */}
      <Card title="2 · Valori automatici (presi dal sistema)">
        <p className="mb-3 text-sm text-slate-500">
          Questi 4 numeri non li digiti: arrivano da Sospesi, LAY/Tris e Master. Qui sotto vedi
          quanto entrano nel totale (già col segno giusto).
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AutoBox
            title="Credito sospeso"
            raw={s.suspendedCredit}
            inTotal={s.suspendedCredit}
            note="Entra così com’è: se positivo resta positivo"
          />
          <AutoBox
            title="Tris"
            raw={s.tris}
            inTotal={-s.tris}
            note="Se positivo (debito) → contrario"
          />
          <AutoBox
            title="Master"
            raw={s.master}
            inTotal={s.master}
            note="Positivo = loro a noi · Negativo = noi a loro · entra così com’è"
          />
          <AutoBox title="LAY" raw={s.lay} inTotal={-s.lay} note="Saldo LAY → sottratto" />
        </div>
        <div className="mt-4 rounded-lg border-2 border-violet-300 bg-violet-50 px-4 py-3">
          <p className="text-sm font-medium text-violet-800">Somma dei 4 automatici</p>
          <p className={`text-2xl font-bold ${amountClass(s.automaticSum)}`}>
            {formatEUR(s.automaticSum)}
          </p>
        </div>
      </Card>

      {/* —— FORM MODIFICA —— */}
      <Card title="Modifica campi manuali">
        <RendicontoForm
          defaults={
            current
              ? {
                  online: toNumber(current.online),
                  manualCreditAdjustment: toNumber(current.manualCreditAdjustment),
                  personalAccounts: toNumber(current.personalAccounts),
                  cash: toNumber(current.cash),
                  coins: toNumber(current.coins),
                  cashTotal: toNumber(current.cashTotal),
                  notes: current.notes,
                }
              : null
          }
          calculatedTotal={s.calculatedTotal}
          suggestedCashTotal={s.suggestedCashTotal}
          manualSum={s.manualSum}
        />
      </Card>

      <Card title="Storico snapshot">
        <SnapshotTable rows={snapshotRows} />
      </Card>
    </div>
  );
}

function ManualLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-base font-semibold ${amountClass(value)}`}>{formatEUR(value)}</p>
    </div>
  );
}

function AutoBox({
  title,
  raw,
  inTotal,
  note,
}: {
  title: string;
  raw: number;
  inTotal: number;
  note: string;
}) {
  return (
    <div className="rounded-lg border-2 border-violet-200 bg-white px-3 py-3">
      <p className="text-sm font-semibold text-violet-900">{title}</p>
      <p className="mt-1 text-xs text-slate-400">
        Valore reale: <span className={amountClass(raw)}>{formatEUR(raw)}</span>
      </p>
      <p className={`mt-2 text-xl font-bold ${amountClass(inTotal)}`}>{formatEUR(inTotal)}</p>
      <p className="mt-1 text-xs text-violet-600">{note}</p>
    </div>
  );
}
