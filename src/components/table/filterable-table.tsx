"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  applyColumnFilters,
  clearColumnFilter,
  countActiveColumnFilters,
  getUniqueFilterValues,
  isAnyColumnFilterActive,
  normalizeFilterValue,
  setColumnFilterValues,
  type ColumnFilters,
} from "@/lib/table-filter";

export type FilterableColumn<T> = {
  id: string;
  header: React.ReactNode;
  /** Testo usato per filtrare (multiselect sui valori distinti) */
  getFilterText: (row: T) => string;
  render: (row: T, index: number) => React.ReactNode;
  filterable?: boolean;
  headerClassName?: string;
  cellClassName?: string | ((row: T) => string);
};

type FilterableTableProps<T> = {
  rows: T[];
  columns: FilterableColumn<T>[];
  getRowKey: (row: T) => string;
  getRowClassName?: (row: T, index: number) => string;
  emptyMessage?: string;
  tableClassName?: string;
  /** Righe extra nel tbody (es. intestazioni di sezione) */
  prependRows?: React.ReactNode;
  /** Se true, mostra barra filtri attivi sopra la tabella */
  showActiveFilters?: boolean;
};

function ColumnFilterMenu<T>({
  column,
  rows,
  filters,
  onChange,
}: {
  column: FilterableColumn<T>;
  rows: T[];
  filters: ColumnFilters;
  onChange: (next: ColumnFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const allValues = useMemo(
    () => getUniqueFilterValues(rows, column.getFilterText),
    [rows, column],
  );

  const selected = filters[column.id] ?? new Set<string>();
  const isActive = selected.size > 0;

  const visibleValues = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allValues;
    return allValues.filter((v) => v.toLowerCase().includes(q));
  }, [allValues, search]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function selectAll() {
    onChange(setColumnFilterValues(filters, column.id, allValues));
  }

  function selectNone() {
    onChange(clearColumnFilter(filters, column.id));
  }

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "ml-1 inline-flex h-6 w-6 items-center justify-center rounded transition",
          isActive
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "text-slate-400 hover:bg-slate-200 hover:text-slate-700",
        )}
        title={`Filtra colonna${isActive ? ` (${selected.size} selezionati)` : ""}`}
        aria-label="Filtra colonna"
      >
        <Filter className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca valore..."
            className="mb-2 w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none"
          />
          <div className="mb-2 flex gap-1">
            <button
              type="button"
              onClick={selectAll}
              className="flex-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-200"
            >
              Tutti
            </button>
            <button
              type="button"
              onClick={selectNone}
              className="flex-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-200"
            >
              Nessuno
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {visibleValues.map((value) => {
              const isChecked = selected.size === 0 || selected.has(value);
              return (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (selected.size === 0) {
                        if (!e.target.checked) {
                          onChange(
                            setColumnFilterValues(
                              filters,
                              column.id,
                              allValues.filter((v) => v !== value),
                            ),
                          );
                        }
                        return;
                      }
                      const nextChecked = e.target.checked;
                      const nextSet = new Set(selected);
                      if (nextChecked) nextSet.add(value);
                      else nextSet.delete(value);
                      if (nextSet.size === allValues.length) {
                        onChange(clearColumnFilter(filters, column.id));
                      } else {
                        onChange(setColumnFilterValues(filters, column.id, nextSet));
                      }
                    }}
                    className="rounded border-slate-300"
                  />
                  <span className="truncate" title={value}>
                    {value}
                  </span>
                </label>
              );
            })}
            {visibleValues.length === 0 && (
              <p className="px-1 py-2 text-center text-xs text-slate-400">Nessun valore</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function FilterableTable<T>({
  rows,
  columns,
  getRowKey,
  getRowClassName,
  emptyMessage = "Nessun risultato",
  tableClassName = "data-table",
  prependRows,
  showActiveFilters = true,
}: FilterableTableProps<T>) {
  const [filters, setFilters] = useState<ColumnFilters>({});

  const filterableColumns = useMemo(
    () => columns.filter((c) => c.filterable !== false),
    [columns],
  );

  const filteredRows = useMemo(
    () => applyColumnFilters(rows, filters, filterableColumns),
    [rows, filters, filterableColumns],
  );

  const activeCount = countActiveColumnFilters(filters);
  const hasFilters = isAnyColumnFilterActive(filters);

  function clearAllFilters() {
    setFilters({});
  }

  function getColumnLabel(columnId: string) {
    const col = columns.find((c) => c.id === columnId);
    if (!col) return columnId;
    if (typeof col.header === "string") return col.header;
    return columnId;
  }

  return (
    <div className="space-y-2">
      {showActiveFilters && hasFilters && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs">
          <span className="font-medium text-emerald-800">
            Filtri attivi ({activeCount}) · {filteredRows.length}/{rows.length} righe
          </span>
          {Object.entries(filters).map(([colId, values]) =>
            values.size > 0 ? (
              <span
                key={colId}
                className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-emerald-900 ring-1 ring-emerald-200"
              >
                <span className="font-medium">{getColumnLabel(colId)}:</span>
                <span className="max-w-[8rem] truncate">
                  {Array.from(values).slice(0, 2).join(", ")}
                  {values.size > 2 ? ` +${values.size - 2}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => setFilters(clearColumnFilter(filters, colId))}
                  className="text-emerald-600 hover:text-emerald-900"
                  aria-label={`Rimuovi filtro ${getColumnLabel(colId)}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : null,
          )}
          <button
            type="button"
            onClick={clearAllFilters}
            className="ml-auto text-emerald-700 underline hover:text-emerald-900"
          >
            Cancella tutti
          </button>
        </div>
      )}

      {!hasFilters && rows.length > 0 && (
        <p className="text-xs text-slate-400">
          {rows.length} righe · clicca l&apos;icona filtro nell&apos;intestazione per multiselezione
        </p>
      )}

      <div className="overflow-x-auto">
        <table className={tableClassName}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.id} className={col.headerClassName}>
                  <div className="flex items-center gap-0.5">
                    <span>{col.header}</span>
                    {col.filterable !== false && rows.length > 0 && (
                      <ColumnFilterMenu
                        column={col}
                        rows={rows}
                        filters={filters}
                        onChange={setFilters}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prependRows}
            {filteredRows.map((row, i) => (
              <tr key={getRowKey(row)} className={getRowClassName?.(row, i)}>
                {columns.map((col) => {
                  const cellClass =
                    typeof col.cellClassName === "function"
                      ? col.cellClassName(row)
                      : col.cellClassName;
                  return (
                    <td key={col.id} className={cellClass}>
                      {col.render(row, i)}
                    </td>
                  );
                })}
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-6 text-center text-slate-400">
                  {hasFilters ? `${emptyMessage} per i filtri selezionati` : emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Esportato per tabelle custom (es. CommissionTable) */
export { normalizeFilterValue, applyColumnFilters, type ColumnFilters };
