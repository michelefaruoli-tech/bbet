"use client";

import { useMemo, useState } from "react";
import { amountClass, formatEUR } from "@/lib/format";
import { formatDateIT } from "@/lib/timezone";
import { DeleteLayButton } from "@/components/lay/delete-lay-button";
import { EditLayButton } from "@/components/lay/edit-lay-button";

const MONTH_LABELS = [
  "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
  "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
];

export type LayOperationRow = {
  id: string;
  date: Date | string;
  time: string | null;
  amount: unknown;
  category: string;
  description: string | null;
  notes: string | null;
  createdBy: { name: string };
  isOpenMonth: boolean;
};

type Props = {
  operations: LayOperationRow[];
  filterYear: string;
  filterMonth: string;
  showAuthor?: boolean;
};

export function LayOperationsHistory({
  operations,
  filterYear,
  filterMonth,
  showAuthor = false,
}: Props) {
  const [showTrisOnly, setShowTrisOnly] = useState(false);

  const filtered = useMemo(() => {
    let rows = operations;
    if (filterYear) {
      rows = rows.filter((m) => new Date(m.date).getFullYear() === Number(filterYear));
    }
    if (filterMonth) {
      rows = rows.filter((m) => new Date(m.date).getMonth() + 1 === Number(filterMonth));
    }
    if (showTrisOnly) {
      rows = rows.filter((m) => m.category === "TRIS");
    }
    return rows;
  }, [operations, filterYear, filterMonth, showTrisOnly]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showTrisOnly}
            onChange={(e) => setShowTrisOnly(e.target.checked)}
            className="rounded border-slate-300"
          />
          Solo vecchie operazioni Tris (storico)
        </label>
        <span className="text-xs text-muted">{filtered.length} operazioni</span>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table sospesi-table text-sm">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Importo</th>
              <th>Tris</th>
              <th>Stato</th>
              <th>Note</th>
              {showAuthor && <th>Inserito da</th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, i) => {
              const d = new Date(m.date);
              const amount = Number(m.amount);
              const isTris = m.category === "TRIS";
              const tipo = amount >= 0 ? "Avere" : "Dare";
              return (
                <tr
                  key={m.id}
                  className={`sospesi-row ${i % 2 === 0 ? "sospesi-row-even" : "sospesi-row-odd"}`}
                >
                  <td className="whitespace-nowrap">
                    {formatDateIT(d)}
                    {m.time ? ` ${m.time}` : ""}
                  </td>
                  <td className={amountClass(amount)}>{tipo}</td>
                  <td className={amountClass(amount)}>{formatEUR(Math.abs(amount))}</td>
                  <td>
                    {isTris ? (
                      <span className="rounded bg-minus-line px-1.5 py-0.5 text-xs font-semibold text-[#5C3208]">
                        Tris storico
                      </span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td>
                    {m.isOpenMonth ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                        Mese aperto
                      </span>
                    ) : (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-muted">
                        {MONTH_LABELS[d.getMonth()]} {d.getFullYear()}
                      </span>
                    )}
                  </td>
                  <td className="max-w-[14rem] truncate">{m.notes || m.description || "—"}</td>
                  {showAuthor && <td>{m.createdBy.name}</td>}
                  <td>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <EditLayButton operation={m} />
                      <DeleteLayButton id={m.id} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={showAuthor ? 8 : 7} className="py-6 text-center text-muted">
                  Nessuna operazione per i filtri selezionati
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
