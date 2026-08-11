"use client";

import { FilterableTable } from "@/components/table/filterable-table";
import { amountClass, formatEUR } from "@/lib/format";

export type SnapshotRow = {
  id: string;
  dateLabel: string;
  calculatedLabel: string;
  cashLabel: string;
  differenceLabel: string;
  difference: number;
  userName: string;
};

export function SnapshotTable({ rows }: { rows: SnapshotRow[] }) {
  return (
    <FilterableTable
      rows={rows}
      tableClassName="data-table"
      getRowKey={(r) => r.id}
      emptyMessage="Nessuno snapshot ancora"
      columns={[
        {
          id: "data",
          header: "Data",
          getFilterText: (r) => r.dateLabel,
          render: (r) => r.dateLabel,
        },
        {
          id: "totale",
          header: "Totale calc.",
          getFilterText: (r) => r.calculatedLabel,
          render: (r) => r.calculatedLabel,
        },
        {
          id: "cassa",
          header: "In cassa",
          getFilterText: (r) => r.cashLabel,
          render: (r) => r.cashLabel,
        },
        {
          id: "diff",
          header: "Differenza",
          getFilterText: (r) => r.differenceLabel,
          cellClassName: (r) => amountClass(r.difference),
          render: (r) => r.differenceLabel,
        },
        {
          id: "utente",
          header: "Utente",
          getFilterText: (r) => r.userName,
          render: (r) => r.userName,
        },
      ]}
    />
  );
}
