"use client";

import { useRouter } from "next/navigation";

const MONTHS = [
  { value: "", label: "Tutti i mesi" },
  { value: "1", label: "Gennaio" },
  { value: "2", label: "Febbraio" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Aprile" },
  { value: "5", label: "Maggio" },
  { value: "6", label: "Giugno" },
  { value: "7", label: "Luglio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Settembre" },
  { value: "10", label: "Ottobre" },
  { value: "11", label: "Novembre" },
  { value: "12", label: "Dicembre" },
];

type Props = {
  years: number[];
  selectedYears: number[];
  filterYear: string;
  filterMonth: string;
};

export function LayFilters({ years, selectedYears, filterYear, filterMonth }: Props) {
  const router = useRouter();

  function apply(next: { years?: number[]; year?: string; month?: string }) {
    const params = new URLSearchParams();
    const yList = next.years ?? selectedYears;
    if (yList.length > 0 && yList.length < years.length) {
      params.set("anni", yList.join(","));
    }
    const y = next.year ?? filterYear;
    const m = next.month ?? filterMonth;
    if (y) params.set("anno", y);
    if (m) params.set("mese", m);
    const qs = params.toString();
    router.push(qs ? `/lay?${qs}` : "/lay");
  }

  function toggleYear(y: number) {
    const set = new Set(selectedYears);
    if (set.has(y)) set.delete(y);
    else set.add(y);
    const next = years.filter((yr) => set.has(yr));
    apply({ years: next.length === 0 ? years : next });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-xs font-medium text-slate-500">Anni in tabella (se non entra bene, togli anni)</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => apply({ years })}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              selectedYears.length === years.length
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tutti
          </button>
          {years.map((y) => {
            const active = selectedYears.includes(y);
            return (
              <button
                key={y}
                type="button"
                onClick={() => toggleYear(y)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {y}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Filtro elenco — Anno</label>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={filterYear}
            onChange={(e) => apply({ year: e.target.value, month: e.target.value ? filterMonth : "" })}
          >
            <option value="">Tutti gli anni</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Filtro elenco — Mese</label>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={filterMonth}
            disabled={!filterYear}
            onChange={(e) => apply({ month: e.target.value })}
          >
            {MONTHS.map((m) => (
              <option key={m.value || "all"} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        {(filterYear || filterMonth || selectedYears.length < years.length) && (
          <button
            type="button"
            onClick={() => {
              router.push("/lay");
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Azzera filtri
          </button>
        )}
      </div>
    </div>
  );
}
