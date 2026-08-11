"use client";

import { useState } from "react";
import { amountClass, formatEUR } from "@/lib/format";
import { ReopenLayMonthButton } from "@/components/lay/reopen-lay-month-button";

const MONTH_LABELS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export type LayClosureCell = {
  year: number;
  month: number;
  balance: number;
  positiveTotal: number;
  negativeTotal: number;
  trisBalance: number;
  cumulativeBalance: number | null;
  movementCount: number;
  /** true = archiviato; false = somma live dalla cronologia */
  closed: boolean;
};

type Props = {
  years: number[];
  cells: LayClosureCell[];
  selectedYears: number[];
};

export function LayYearTable({ years, cells, selectedYears }: Props) {
  const visibleYears = selectedYears.length > 0 ? selectedYears : years;
  const map = new Map(cells.map((c) => [`${c.year}-${c.month}`, c]));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  function cell(year: number, month: number): LayClosureCell | null {
    return map.get(`${year}-${month}`) ?? null;
  }

  const yearTotals = visibleYears.map((y) =>
    MONTH_LABELS.reduce((sum, _, i) => sum + (cell(y, i + 1)?.balance ?? 0), 0),
  );
  const grandTotal = yearTotals.reduce((s, n) => s + n, 0);
  const yearAvg = visibleYears.length ? grandTotal / visibleYears.length : 0;
  const monthsWithData = visibleYears.reduce((count, y) => {
    return count + MONTH_LABELS.filter((_, i) => cell(y, i + 1) !== null).length;
  }, 0);
  const monthAvg = monthsWithData ? grandTotal / monthsWithData : 0;

  const selected = selectedKey ? map.get(selectedKey) ?? null : null;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="data-table lay-year-table text-sm">
          <thead>
            <tr className="bg-emerald-50">
              <th className="sticky left-0 z-10 min-w-[6rem] bg-emerald-50">Mese</th>
              {visibleYears.map((y, yi) => (
                <th
                  key={y}
                  className={`lay-year-col min-w-[5.5rem] text-center ${yi === 0 ? "lay-year-col-first" : ""}`}
                >
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MONTH_LABELS.map((label, idx) => {
              const month = idx + 1;
              return (
                <tr key={month}>
                  <td className="sticky left-0 z-10 bg-white font-medium whitespace-nowrap">{label}</td>
                  {visibleYears.map((y, yi) => {
                    const data = cell(y, month);
                    const key = `${y}-${month}`;
                    const isSelected = selectedKey === key;

                    if (!data) {
                      return (
                        <td
                          key={y}
                          className={`lay-year-col text-right text-slate-300 tabular-nums ${yi === 0 ? "lay-year-col-first" : ""}`}
                        >
                          —
                        </td>
                      );
                    }

                    const value = data.balance;
                    return (
                      <td
                        key={y}
                        className={`lay-year-col text-right tabular-nums ${yi === 0 ? "lay-year-col-first" : ""}`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedKey(isSelected ? null : key)}
                          className={`w-full rounded px-1 py-0.5 font-medium transition hover:ring-2 hover:ring-emerald-400 ${amountClass(value)} ${
                            !data.closed
                              ? "border border-dashed border-amber-300 bg-amber-50/70"
                              : value < 0
                                ? "bg-red-50"
                                : value > 0
                                  ? "bg-emerald-50/60"
                                  : ""
                          } ${isSelected ? "ring-2 ring-emerald-600" : ""}`}
                          title={
                            data.closed
                              ? "Mese chiuso — clicca per dettaglio"
                              : "Mese aperto — somma live dalla cronologia"
                          }
                        >
                          {formatEUR(value)}
                          {!data.closed && (
                            <span className="mt-0.5 block text-[10px] font-normal text-amber-700">
                              in corso
                            </span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-amber-50 font-semibold">
              <td className="sticky left-0 z-10 bg-amber-50">Totale</td>
              {yearTotals.map((t, i) => (
                <td
                  key={visibleYears[i]}
                  className={`lay-year-col text-right tabular-nums ${amountClass(t)} ${i === 0 ? "lay-year-col-first" : ""}`}
                >
                  {formatEUR(t)}
                </td>
              ))}
            </tr>
            <tr className="bg-slate-50 text-xs text-slate-600">
              <td className="sticky left-0 z-10 bg-slate-50" colSpan={visibleYears.length + 1}>
                Totale complessivo:{" "}
                <strong className={amountClass(grandTotal)}>{formatEUR(grandTotal)}</strong>
                {" · "}Media annuale: <strong>{formatEUR(yearAvg)}</strong>
                {" · "}Media mensile: <strong>{formatEUR(monthAvg)}</strong>
                {" · "}Celle tratteggiate = mese aperto (si aggiorna da solo)
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {selected && (
        <div
          className={`rounded-lg border-2 p-4 ${
            selected.closed
              ? "border-emerald-300 bg-emerald-50/50"
              : "border-amber-300 bg-amber-50/50"
          }`}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3
              className={`font-semibold ${selected.closed ? "text-emerald-900" : "text-amber-900"}`}
            >
              {selected.closed ? "Chiusura" : "In corso"} {MONTH_LABELS[selected.month - 1]}{" "}
              {selected.year}
            </h3>
            <div className="flex items-center gap-2">
              {selected.closed && (
                <ReopenLayMonthButton year={selected.year} month={selected.month} />
              )}
              <button
                type="button"
                onClick={() => setSelectedKey(null)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Chiudi pannello
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <p className="text-xs text-slate-500">Positivo</p>
              <p className="font-semibold text-emerald-600">
                {formatEUR(selected.positiveTotal)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Negativo</p>
              <p className="font-semibold text-red-600">{formatEUR(selected.negativeTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Saldo mese</p>
              <p className={`font-semibold ${amountClass(selected.balance)}`}>
                {formatEUR(selected.balance)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Tris nel mese</p>
              <p className="font-semibold">{formatEUR(selected.trisBalance)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Cumulativo cassa</p>
              <p className="font-semibold">
                {selected.cumulativeBalance === null
                  ? "—"
                  : formatEUR(selected.cumulativeBalance)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Movimenti</p>
              <p className="font-semibold">{selected.movementCount}</p>
            </div>
          </div>
          {!selected.closed && (
            <p className="mt-3 text-xs text-amber-800">
              Somma automatica dalla cronologia. Quando chiudi il mese, il valore resta archiviato.
            </p>
          )}
        </div>
      )}

      {!selected && (
        <p className="text-xs text-slate-400">
          Clicca un importo per il dettaglio. I mesi aperti (bordo tratteggiato) si aggiornano da soli
          quando inserisci operazioni.
        </p>
      )}

      {visibleYears.length === 0 && (
        <p className="py-6 text-center text-slate-400">Seleziona almeno un anno dal filtro</p>
      )}
    </div>
  );
}
