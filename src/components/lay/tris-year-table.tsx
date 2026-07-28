"use client";

import { useState } from "react";
import { amountClass, formatEUR } from "@/lib/format";
import { ReopenTrisMonthButton } from "@/components/lay/reopen-tris-month-button";

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
  cumulativeBalance: number;
  movementCount: number;
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

  function cell(year: number, month: number) {
    return map.get(`${year}-${month}`) ?? null;
  }

  const selected = selectedKey ? map.get(selectedKey) ?? null : null;

  return (
    <div className="space-y-3">
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
                            value < 0 ? "bg-red-50" : value > 0 ? "bg-violet-50" : ""
                          } ${isSelected ? "ring-2 ring-violet-600" : ""}`}
                          title="Dettaglio rendiconto Tris"
                        >
                          {formatEUR(value)}
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
        <div className="rounded-lg border-2 border-violet-300 bg-violet-50/50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-violet-900">
              Rendiconto Tris {MONTH_LABELS[selected.month - 1]} {selected.year}
            </h3>
            <div className="flex items-center gap-2">
              <ReopenTrisMonthButton year={selected.year} month={selected.month} />
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
              <p className={`font-semibold ${amountClass(selected.cumulativeBalance)}`}>
                {formatEUR(selected.cumulativeBalance)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Movimenti</p>
              <p className="font-semibold">{selected.movementCount}</p>
            </div>
          </div>
        </div>
      )}

      {!selected && (
        <p className="text-xs text-slate-400">
          Clicca su un importo per il dettaglio del rendiconto Tris mensile. Puoi anche riaprirlo se
          hai sbagliato.
        </p>
      )}
    </div>
  );
}
