"use client";

import { useMemo, useState } from "react";
import { amountClass, formatEUR } from "@/lib/format";
import { ReopenTrisMonthButton } from "@/components/lay/reopen-tris-month-button";
import { Filter, X } from "lucide-react";

const MONTH_LABELS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export type TrisClosureCell = {
  year: number;
  month: number;
  dareTotal: number;
  avereTotal: number;
  monthlyBalance: number;
  cumulativeBalance: number | null;
  movementCount: number;
  closed: boolean;
};

type Props = {
  years: number[];
  cells: TrisClosureCell[];
  selectedYears: number[];
};

export function TrisYearTable({ years, cells, selectedYears }: Props) {
  const visibleYears = selectedYears.length > 0 ? selectedYears : years;
  const map = new Map(cells.map((c) => [`${c.year}-${c.month}`, c]));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<Set<number>>(new Set());

  const visibleMonths = useMemo(() => {
    const all = MONTH_LABELS.map((label, idx) => ({ label, month: idx + 1 }));
    if (monthFilter.size === 0) return all;
    return all.filter((m) => monthFilter.has(m.month));
  }, [monthFilter]);

  function toggleMonth(month: number) {
    setMonthFilter((prev) => {
      const next = new Set(prev);
      if (prev.size === 0) {
        for (let m = 1; m <= 12; m++) if (m !== month) next.add(m);
        return next;
      }
      if (next.has(month)) next.delete(month);
      else next.add(month);
      if (next.size === 12) return new Set();
      return next;
    });
  }

  function cell(year: number, month: number) {
    return map.get(`${year}-${month}`) ?? null;
  }

  const selected = selectedKey ? map.get(selectedKey) ?? null : null;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
        <p className="mb-2 text-xs font-medium text-slate-600">
          <Filter className="mr-1 inline h-3.5 w-3.5" />
          Filtra mesi (multiselezione)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {MONTH_LABELS.map((label, idx) => {
            const month = idx + 1;
            const active = monthFilter.size === 0 || monthFilter.has(month);
            return (
              <button
                key={month}
                type="button"
                onClick={() => toggleMonth(month)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                  active
                    ? "bg-violet-600 text-white"
                    : "bg-white text-slate-500 ring-1 ring-slate-200 line-through"
                }`}
              >
                {label.slice(0, 3)}
              </button>
            );
          })}
          {monthFilter.size > 0 && (
            <button
              type="button"
              onClick={() => setMonthFilter(new Set())}
              className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-300"
            >
              <X className="h-3 w-3" /> Tutti
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table lay-year-table text-sm">
          <thead>
            <tr className="bg-violet-50">
              <th className="sticky left-0 z-10 min-w-[6rem] bg-violet-50">Mese</th>
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
            {visibleMonths.map(({ label, month }) => {
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
                    const value = data.monthlyBalance;
                    return (
                      <td
                        key={y}
                        className={`lay-year-col text-right tabular-nums ${yi === 0 ? "lay-year-col-first" : ""}`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedKey(isSelected ? null : key)}
                          className={`w-full rounded px-1 py-0.5 font-medium transition hover:ring-2 hover:ring-violet-400 ${amountClass(value)} ${
                            !data.closed
                              ? "border border-dashed border-amber-300 bg-amber-50/70"
                              : value < 0
                                ? "bg-red-50"
                                : value > 0
                                  ? "bg-violet-50"
                                  : ""
                          } ${isSelected ? "ring-2 ring-violet-600" : ""}`}
                          title={
                            data.closed
                              ? "Mese chiuso — dettaglio Tris"
                              : "Mese aperto — somma live Tris"
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
        </table>
      </div>

      {selected && (
        <div
          className={`rounded-lg border-2 p-4 ${
            selected.closed
              ? "border-violet-300 bg-violet-50/50"
              : "border-amber-300 bg-amber-50/50"
          }`}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3
              className={`font-semibold ${selected.closed ? "text-violet-900" : "text-amber-900"}`}
            >
              {selected.closed ? "Rendiconto Tris" : "Tris in corso"}{" "}
              {MONTH_LABELS[selected.month - 1]} {selected.year}
            </h3>
            <div className="flex items-center gap-2">
              {selected.closed && (
                <ReopenTrisMonthButton year={selected.year} month={selected.month} />
              )}
              <button
                type="button"
                onClick={() => setSelectedKey(null)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Chiudi
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="text-xs text-slate-500">Avere (operazioni +)</p>
              <p className="font-semibold text-emerald-700">{formatEUR(selected.avereTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Dare (operazioni −)</p>
              <p className="font-semibold text-amber-700">{formatEUR(selected.dareTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Saldo mese</p>
              <p className={`font-semibold ${amountClass(selected.monthlyBalance)}`}>
                {formatEUR(selected.monthlyBalance)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Cumulativo (quanto devi)</p>
              <p className={`font-semibold ${amountClass(selected.cumulativeBalance ?? 0)}`}>
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
              Somma automatica delle operazioni Tris del mese. Si aggiorna a ogni inserimento.
            </p>
          )}
        </div>
      )}

      {!selected && (
        <p className="text-xs text-slate-400">
          Clicca un importo per il dettaglio. Celle tratteggiate = mese aperto (live).
        </p>
      )}
    </div>
  );
}
