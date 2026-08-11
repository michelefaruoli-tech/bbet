/** Valori selezionati per ogni colonna (multiselect). Set vuoto = nessun filtro attivo. */
export type ColumnFilters = Record<string, Set<string>>;

export function normalizeFilterValue(value: string): string {
  const trimmed = value.trim();
  return trimmed || "—";
}

export function getUniqueFilterValues<T>(
  rows: T[],
  getFilterText: (row: T) => string,
): string[] {
  const values = new Set<string>();
  for (const row of rows) {
    values.add(normalizeFilterValue(getFilterText(row)));
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }));
}

export function applyColumnFilters<T>(
  rows: T[],
  filters: ColumnFilters,
  columns: { id: string; getFilterText: (row: T) => string; filterable?: boolean }[],
): T[] {
  const activeColumns = columns.filter((col) => col.filterable !== false);

  return rows.filter((row) => {
    for (const col of activeColumns) {
      const selected = filters[col.id];
      if (!selected || selected.size === 0) continue;
      const value = normalizeFilterValue(col.getFilterText(row));
      if (!selected.has(value)) return false;
    }
    return true;
  });
}

export function isAnyColumnFilterActive(filters: ColumnFilters): boolean {
  return Object.values(filters).some((values) => values.size > 0);
}

export function countActiveColumnFilters(filters: ColumnFilters): number {
  return Object.values(filters).filter((values) => values.size > 0).length;
}

export function clearColumnFilter(filters: ColumnFilters, columnId: string): ColumnFilters {
  const next = { ...filters };
  delete next[columnId];
  return next;
}

export function toggleFilterValue(
  filters: ColumnFilters,
  columnId: string,
  value: string,
  checked: boolean,
): ColumnFilters {
  const current = new Set(filters[columnId] ?? []);
  if (checked) current.add(value);
  else current.delete(value);

  const next = { ...filters };
  if (current.size === 0) delete next[columnId];
  else next[columnId] = current;
  return next;
}

export function setColumnFilterValues(
  filters: ColumnFilters,
  columnId: string,
  values: Iterable<string>,
): ColumnFilters {
  const set = new Set(values);
  const next = { ...filters };
  if (set.size === 0) delete next[columnId];
  else next[columnId] = set;
  return next;
}
