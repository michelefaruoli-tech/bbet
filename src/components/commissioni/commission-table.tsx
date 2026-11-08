"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveCommissionMonthAction } from "@/lib/actions";
import { formatEUR, toNumber } from "@/lib/format";
import {
  calcCasinoNet,
  calcCommissionCashBalance,
  calcCommissionFinal,
  calcCommissionIndicators,
  calcCommissionPartial,
} from "@/lib/calculations";
import { Button } from "@/components/ui";

const MONTH_LABELS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

type Month = {
  id: string;
  month: number;
  invoiceAmount: number;
  bonusAmount: number;
  casinoGross: number;
  sportNet: number;
  withdrawals: number;
  cashFund: number;
  closed: boolean;
};

function toInput(v: unknown) {
  const n = toNumber(v);
  return n === 0 ? "" : n.toFixed(2).replace(".", ",");
}

function parseInput(v: string) {
  const cleaned = v.trim().replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

type RowState = {
  invoice: string;
  bonus: string;
  casinoGross: string;
  sportNet: string;
  withdrawals: string;
  cashFund: string;
};

function initRow(m: Month): RowState {
  return {
    invoice: toInput(m.invoiceAmount),
    bonus: toInput(m.bonusAmount),
    casinoGross: toInput(m.casinoGross),
    sportNet: toInput(m.sportNet),
    withdrawals: toInput(m.withdrawals),
    cashFund: toInput(m.cashFund),
  };
}

function calcRow(row: RowState) {
  const invoice = parseInput(row.invoice);
  const bonus = parseInput(row.bonus);
  const casinoGross = parseInput(row.casinoGross);
  const sportNet = parseInput(row.sportNet);
  const withdrawals = parseInput(row.withdrawals);
  const cashFund = parseInput(row.cashFund);
  const casinoNet = calcCasinoNet(casinoGross);
  const partial = calcCommissionPartial(invoice, bonus);
  const finalTotal = calcCommissionFinal(invoice, bonus, cashFund, withdrawals);
  const indicators = calcCommissionIndicators(casinoNet, sportNet);
  return {
    invoice,
    bonus,
    casinoGross,
    sportNet,
    withdrawals,
    cashFund,
    casinoNet,
    partial,
    finalTotal,
    indicators,
  };
}

export function CommissionTable({ year, months }: { year: number; months: Month[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(months.map((m) => [m.id, initRow(m)])),
  );
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<Record<string, string>>({});
  const [pendingId, startTransition] = useTransition();

  const totals = useMemo(() => {
    return months.reduce(
      (acc, m) => {
        const c = calcRow(rows[m.id] ?? initRow(m));
        return {
          invoice: acc.invoice + c.invoice,
          bonus: acc.bonus + c.bonus,
          casinoGross: acc.casinoGross + c.casinoGross,
          casinoNet: acc.casinoNet + c.casinoNet,
          sportNet: acc.sportNet + c.sportNet,
          withdrawals: acc.withdrawals + c.withdrawals,
          cashFund: acc.cashFund + c.cashFund,
          partial: acc.partial + c.partial,
          final: acc.final + c.finalTotal,
          indicators: acc.indicators + c.indicators,
        };
      },
      {
        invoice: 0,
        bonus: 0,
        casinoGross: 0,
        casinoNet: 0,
        sportNet: 0,
        withdrawals: 0,
        cashFund: 0,
        partial: 0,
        final: 0,
        indicators: 0,
      },
    );
  }, [months, rows]);

  // Saldo cassa reale annuale (da confrontare col Rendiconto)
  const saldoCassaReale = calcCommissionCashBalance({
    invoiceTotal: totals.invoice,
    bonusTotal: totals.bonus,
    cashFundTotal: totals.cashFund,
    withdrawalsTotal: totals.withdrawals,
  });

  function updateRow(id: string, field: keyof RowState, value: string) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    setDirty((prev) => ({ ...prev, [id]: true }));
    setStatus((prev) => ({ ...prev, [id]: "" }));
  }

  function saveRow(month: Month) {
    const row = rows[month.id];
    if (!row) return;
    const fd = new FormData();
    fd.set("id", month.id);
    fd.set("invoiceAmount", row.invoice || "0");
    fd.set("bonusAmount", row.bonus || "0");
    fd.set("casinoGross", row.casinoGross || "0");
    fd.set("sportNet", row.sportNet || "0");
    fd.set("withdrawals", row.withdrawals || "0");
    fd.set("cashFund", row.cashFund || "0");

    startTransition(async () => {
      try {
        await saveCommissionMonthAction(fd);
        setDirty((prev) => ({ ...prev, [month.id]: false }));
        setStatus((prev) => ({ ...prev, [month.id]: "Salvato" }));
        router.refresh();
      } catch {
        setStatus((prev) => ({ ...prev, [month.id]: "Errore" }));
      }
    });
  }

  const cellInput =
    "w-full min-w-[4.5rem] rounded border border-slate-200 bg-card px-1.5 py-1 text-right text-sm focus:border-emerald-500 focus:outline-none";
  const cellReadonly = "text-right text-sm text-slate-700 tabular-nums";

  return (
    <div className="space-y-5">
      {/* SALDO = Commissioni + Fondo − Prelievi */}
      <div className="rounded-xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
          Totale da Commissioni {year}
        </p>
        <p className="mt-1 text-3xl font-bold text-amber-950">{formatEUR(saldoCassaReale)}</p>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-lg border border-accent bg-card/80 px-3 py-2">
            <p className="text-xs text-accent-dark">Commissioni annuali</p>
            <p className="font-bold text-emerald-950">
              {formatEUR(totals.invoice + totals.bonus)}
            </p>
          </div>
          <div className="rounded-lg border border-sky-200 bg-card/80 px-3 py-2">
            <p className="text-xs text-sky-700">+ Fondo cassa (fisso)</p>
            <p className="font-bold text-sky-950">{formatEUR(totals.cashFund)}</p>
          </div>
          <div className="rounded-lg border border-rose-200 bg-card/80 px-3 py-2">
            <p className="text-xs text-rose-700">− Prelievi</p>
            <p className="font-bold text-rose-700">{formatEUR(totals.withdrawals)}</p>
            <a href="/cassa/prelievi" className="text-xs text-rose-600 underline">
              Gestisci in Prelievi →
            </a>
          </div>
        </div>
        <p className="mt-2 text-xs text-amber-800">
          Formula: Commissioni (Fatt+Bonus) + Fondo cassa − Prelievi (inseriti nella pagina Prelievi)
        </p>
      </div>

      {/* TABELLA 1 — Fatture + Bonus (Commissioni) */}
      <div className="overflow-hidden rounded-xl border-2 border-emerald-300 bg-card">
        <div className="border-b border-accent bg-accent-soft px-4 py-2">
          <h3 className="font-semibold text-emerald-900">1 · Fatture + Bonus (Commissioni)</h3>
          <p className="text-xs text-accent-dark">Parziale mese = Fatt + Bonus</p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table text-sm">
            <thead>
              <tr className="bg-accent-soft/80 text-xs">
                <th className="sticky left-0 bg-accent-soft">Mese</th>
                <th>Fatture</th>
                <th>Bonus</th>
                <th>Parziale</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => {
                const row = rows[m.id] ?? initRow(m);
                const c = calcRow(row);
                return (
                  <tr key={`comm-${m.id}`} className={m.closed ? "opacity-60" : ""}>
                    <td className="sticky left-0 bg-card font-medium whitespace-nowrap">
                      {MONTH_LABELS[m.month - 1]}
                    </td>
                    <td>
                      <input
                        className={cellInput}
                        value={row.invoice}
                        onChange={(e) => updateRow(m.id, "invoice", e.target.value)}
                        disabled={m.closed}
                        placeholder="0"
                      />
                    </td>
                    <td>
                      <input
                        className={cellInput}
                        value={row.bonus}
                        onChange={(e) => updateRow(m.id, "bonus", e.target.value)}
                        disabled={m.closed}
                        placeholder="0"
                      />
                    </td>
                    <td className={`${cellReadonly} font-medium`}>{formatEUR(c.partial)}</td>
                    <td className="whitespace-nowrap">
                      <SaveCell
                        dirty={!!dirty[m.id]}
                        pending={pendingId}
                        closed={m.closed}
                        status={status[m.id]}
                        onSave={() => saveRow(m)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-emerald-100 font-semibold">
                <td className="sticky left-0 bg-emerald-100">Totale {year}</td>
                <td className="text-right tabular-nums">{formatEUR(totals.invoice)}</td>
                <td className="text-right tabular-nums">{formatEUR(totals.bonus)}</td>
                <td className="text-right tabular-nums">{formatEUR(totals.partial)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* TABELLA 2 — Casino / Sport */}
      <div className="overflow-hidden rounded-xl border-2 border-sky-300 bg-card">
        <div className="border-b border-sky-200 bg-sky-50 px-4 py-2">
          <h3 className="font-semibold text-sky-900">2 · Casino lordo / netto · Sport</h3>
          <p className="text-xs text-sky-700">
            Casino netto = 40% del lordo · Indicatori informativi (non nel saldo cassa)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table text-sm">
            <thead>
              <tr className="bg-sky-50/80 text-xs">
                <th className="sticky left-0 bg-sky-50">Mese</th>
                <th>Lordo Casino</th>
                <th>Casino netto</th>
                <th>Netto Sport</th>
                <th>Indicatore</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => {
                const row = rows[m.id] ?? initRow(m);
                const c = calcRow(row);
                return (
                  <tr key={`casino-${m.id}`} className={m.closed ? "opacity-60" : ""}>
                    <td className="sticky left-0 bg-card font-medium whitespace-nowrap">
                      {MONTH_LABELS[m.month - 1]}
                    </td>
                    <td>
                      <input
                        className={cellInput}
                        value={row.casinoGross}
                        onChange={(e) => updateRow(m.id, "casinoGross", e.target.value)}
                        disabled={m.closed}
                        placeholder="0"
                      />
                    </td>
                    <td className={cellReadonly}>{formatEUR(c.casinoNet)}</td>
                    <td>
                      <input
                        className={cellInput}
                        value={row.sportNet}
                        onChange={(e) => updateRow(m.id, "sportNet", e.target.value)}
                        disabled={m.closed}
                        placeholder="0"
                      />
                    </td>
                    <td className={cellReadonly}>{formatEUR(c.indicators)}</td>
                    <td className="whitespace-nowrap">
                      <SaveCell
                        dirty={!!dirty[m.id]}
                        pending={pendingId}
                        closed={m.closed}
                        status={status[m.id]}
                        onSave={() => saveRow(m)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-sky-100 font-semibold">
                <td className="sticky left-0 bg-sky-100">Totale {year}</td>
                <td className="text-right tabular-nums">{formatEUR(totals.casinoGross)}</td>
                <td className="text-right tabular-nums">{formatEUR(totals.casinoNet)}</td>
                <td className="text-right tabular-nums">{formatEUR(totals.sportNet)}</td>
                <td className="text-right tabular-nums">{formatEUR(totals.indicators)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* TABELLA 3 — Cassa / Prelievi */}
      <div className="overflow-hidden rounded-xl border-2 border-amber-300 bg-card">
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2">
          <h3 className="font-semibold text-amber-900">3 · Fondo cassa · Prelievi</h3>
          <p className="text-xs text-amber-800">
            Fondo cassa = chiusura anno precedente (fisso) · Prelievi in sola lettura (si inseriscono
            in{" "}
            <a href="/cassa/prelievi" className="font-semibold underline">
              Prelievi
            </a>
            )
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table text-sm">
            <thead>
              <tr className="bg-amber-50/80 text-xs">
                <th className="sticky left-0 bg-amber-50">Mese</th>
                <th>Fondo cassa</th>
                <th>Prelievi (da pagina Prelievi)</th>
                <th>Contributo mese*</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => {
                const row = rows[m.id] ?? initRow(m);
                const c = calcRow(row);
                return (
                  <tr key={`cassa-${m.id}`} className={m.closed ? "opacity-60" : ""}>
                    <td className="sticky left-0 bg-card font-medium whitespace-nowrap">
                      {MONTH_LABELS[m.month - 1]}
                    </td>
                    <td>
                      <input
                        className={cellInput}
                        value={row.cashFund}
                        onChange={(e) => updateRow(m.id, "cashFund", e.target.value)}
                        disabled={m.closed}
                        placeholder="0"
                      />
                    </td>
                    <td className={`${cellReadonly} text-rose-700`}>{formatEUR(c.withdrawals)}</td>
                    <td className={`${cellReadonly} font-medium`}>{formatEUR(c.finalTotal)}</td>
                    <td className="whitespace-nowrap">
                      <SaveCell
                        dirty={!!dirty[m.id]}
                        pending={pendingId}
                        closed={m.closed}
                        status={status[m.id]}
                        onSave={() => saveRow(m)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-amber-100 font-semibold">
                <td className="sticky left-0 bg-amber-100">Totale {year}</td>
                <td className="text-right tabular-nums">{formatEUR(totals.cashFund)}</td>
                <td className="text-right tabular-nums text-rose-700">
                  {formatEUR(totals.withdrawals)}
                </td>
                <td className="text-right tabular-nums">{formatEUR(totals.final)}</td>
                <td></td>
              </tr>
              <tr className="bg-amber-50 text-xs text-amber-900">
                <td colSpan={5} className="px-3 py-2">
                  * Contributo mese = Fatt + Bonus + Fondo − Prelievi del mese. La somma dei
                  contributi = <strong>Saldo cassa reale {formatEUR(saldoCassaReale)}</strong>. Per
                  inserire/modificare prelievi vai su{" "}
                  <a href="/cassa/prelievi" className="font-semibold underline">
                    Prelievi
                  </a>
                  .
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function SaveCell({
  dirty,
  pending,
  closed,
  status,
  onSave,
}: {
  dirty: boolean;
  pending: boolean;
  closed: boolean;
  status?: string;
  onSave: () => void;
}) {
  return (
    <>
      <Button
        type="button"
        disabled={!dirty || pending || closed}
        onClick={onSave}
        className="!px-2 !py-1 text-xs"
      >
        {pending ? "..." : "Salva"}
      </Button>
      {status && (
        <span className={`ml-1 text-xs ${status === "Salvato" ? "text-accent" : "text-red-600"}`}>
          {status}
        </span>
      )}
    </>
  );
}
