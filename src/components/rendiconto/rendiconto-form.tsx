"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveFinancialStatementAction } from "@/lib/actions";
import { formatEUR, toNumber } from "@/lib/format";
import { Button } from "@/components/ui";

type Defaults = {
  online: unknown;
  manualCreditAdjustment: unknown;
  personalAccounts: unknown;
  cash: unknown;
  coins: unknown;
  cashTotal: unknown;
  notes?: string | null;
} | null;

function num(v: unknown) {
  return toNumber(v).toFixed(2).replace(".", ",");
}

export function RendicontoForm({
  defaults,
  calculatedTotal,
  suggestedCashTotal,
  manualSum,
}: {
  defaults: Defaults;
  calculatedTotal: number;
  suggestedCashTotal: number;
  manualSum: number;
}) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [cashTotal, setCashTotal] = useState(num(defaults?.cashTotal ?? 0));

  return (
    <form
      className="form-grid"
      onChange={() => setDirty(true)}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          await saveFinancialStatementAction(fd);
          setDirty(false);
          router.refresh();
        });
      }}
    >
      <div className="field">
        <label>Online</label>
        <input name="online" defaultValue={num(defaults?.online ?? 0)} />
      </div>
      <div className="field">
        <label>Credito positivo/negativo (rettifica)</label>
        <input
          name="manualCreditAdjustment"
          defaultValue={num(defaults?.manualCreditAdjustment ?? 0)}
        />
      </div>
      <div className="field">
        <label>Conti personali</label>
        <input name="personalAccounts" defaultValue={num(defaults?.personalAccounts ?? 0)} />
      </div>
      <div className="field">
        <label>Contanti</label>
        <input name="cash" defaultValue={num(defaults?.cash ?? 0)} />
      </div>
      <div className="field">
        <label>Monete</label>
        <input name="coins" defaultValue={num(defaults?.coins ?? 0)} />
      </div>
      <div className="field">
        <label>Totale in cassa (conteggio fisico)</label>
        <input
          name="cashTotal"
          value={cashTotal}
          onChange={(e) => setCashTotal(e.target.value)}
        />
        <button
          type="button"
          className="mt-1 text-xs text-emerald-600 hover:underline"
          onClick={() => {
            setCashTotal(formatEUR(suggestedCashTotal).replace("€", "").trim());
            setDirty(true);
          }}
        >
          Usa suggerimento: {formatEUR(suggestedCashTotal)}
        </button>
      </div>

      <div className="field md:col-span-2 rounded-lg border-2 border-sky-300 bg-sky-50 p-3">
        <label className="text-sky-800">Somma campi manuali (dopo salvataggio)</label>
        <input value={formatEUR(manualSum)} readOnly className="bg-white font-semibold" />
      </div>
      <div className="field md:col-span-2">
        <label>Totale Rendiconto (manuali + automatici)</label>
        <input value={formatEUR(calculatedTotal)} readOnly className="bg-slate-50 font-semibold" />
      </div>

      <div className="field md:col-span-2">
        <label>Note</label>
        <textarea name="notes" defaultValue={defaults?.notes ?? ""} />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={!dirty || pending}>
          {pending ? "Salvataggio..." : "Salva cambiamenti"}
        </Button>
      </div>
    </form>
  );
}
