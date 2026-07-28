"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCommissionMonthAction } from "@/lib/actions";
import { formatEUR, toNumber } from "@/lib/format";
import { calcCasinoNet, calcCommissionPartial, calcCommissionFinal } from "@/lib/calculations";
import { Button } from "@/components/ui";

type Month = {
  id: string;
  invoiceAmount: unknown;
  bonusAmount: unknown;
  casinoGross: unknown;
  casinoNet: unknown;
  sportNet: unknown;
  withdrawals: unknown;
  cashFund: unknown;
  partialTotal: unknown;
  finalTotal: unknown;
  notes?: string | null;
  closed: boolean;
};

function num(v: unknown) {
  return toNumber(v).toFixed(2).replace(".", ",");
}

export function CommissionMonthForm({ month }: { month: Month }) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [invoice, setInvoice] = useState(num(month.invoiceAmount));
  const [bonus, setBonus] = useState(num(month.bonusAmount));
  const [casinoGross, setCasinoGross] = useState(num(month.casinoGross));
  const [sportNet, setSportNet] = useState(num(month.sportNet));
  const [withdrawals, setWithdrawals] = useState(num(month.withdrawals));
  const [cashFund, setCashFund] = useState(num(month.cashFund));

  const gross = parseFloat(casinoGross.replace(",", ".")) || 0;
  const casinoNet = calcCasinoNet(gross);
  const inv = parseFloat(invoice.replace(",", ".")) || 0;
  const bon = parseFloat(bonus.replace(",", ".")) || 0;
  const wit = parseFloat(withdrawals.replace(",", ".")) || 0;
  const cash = parseFloat(cashFund.replace(",", ".")) || 0;
  const partial = calcCommissionPartial(inv, bon);
  const finalTotal = calcCommissionFinal(inv, bon, cash, wit);

  return (
    <form
      className="form-grid"
      onChange={() => setDirty(true)}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("id", month.id);
        startTransition(async () => {
          await saveCommissionMonthAction(fd);
          setDirty(false);
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="id" value={month.id} />
      <div className="field"><label>Fattura</label><input name="invoiceAmount" value={invoice} onChange={(e) => setInvoice(e.target.value)} disabled={month.closed} /></div>
      <div className="field"><label>Bonus</label><input name="bonusAmount" value={bonus} onChange={(e) => setBonus(e.target.value)} disabled={month.closed} /></div>
      <div className="field"><label>Casino lordo</label><input name="casinoGross" value={casinoGross} onChange={(e) => setCasinoGross(e.target.value)} disabled={month.closed} /></div>
      <div className="field"><label>Casino netto (40%)</label><input value={formatEUR(casinoNet)} readOnly className="bg-slate-50" /></div>
      <div className="field"><label>Netto Sport</label><input name="sportNet" value={sportNet} onChange={(e) => setSportNet(e.target.value)} disabled={month.closed} /></div>
      <div className="field"><label>Prelievi</label><input name="withdrawals" value={withdrawals} onChange={(e) => setWithdrawals(e.target.value)} disabled={month.closed} /></div>
      <div className="field"><label>Fondo cassa</label><input name="cashFund" value={cashFund} onChange={(e) => setCashFund(e.target.value)} disabled={month.closed} /></div>
      <div className="field"><label>Totale parziale</label><input value={formatEUR(partial)} readOnly className="bg-slate-50" /></div>
      <div className="field"><label>Totale finale</label><input value={formatEUR(finalTotal)} readOnly className="bg-slate-50" /></div>
      <div className="field md:col-span-2"><label>Note</label><textarea name="notes" defaultValue={month.notes ?? ""} disabled={month.closed} /></div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={!dirty || pending || month.closed}>
          {pending ? "Salvataggio..." : "Salva cambiamenti"}
        </Button>
        {month.closed && <span className="ml-3 text-sm text-amber-600">Mese chiuso/archiviato</span>}
      </div>
    </form>
  );
}
