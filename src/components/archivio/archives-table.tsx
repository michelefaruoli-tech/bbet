"use client";

import { FilterableTable } from "@/components/table/filterable-table";
import { ReopenYearButton } from "@/components/archivio/reopen-year-button";
import { formatEUR } from "@/lib/format";

export type ArchiveRow = {
  id: string;
  year: number;
  yearLabel: string;
  openingLabel: string;
  closingLabel: string;
  suspendedLabel: string;
  masterLabel: string;
  layLabel: string;
  commissionLabel: string;
  withdrawalLabel: string;
  closedAtLabel: string;
};

export function ArchivesTable({ rows }: { rows: ArchiveRow[] }) {
  return (
    <FilterableTable
      rows={rows}
      tableClassName="data-table"
      getRowKey={(r) => r.id}
      emptyMessage="Nessun anno archiviato"
      columns={[
        {
          id: "anno",
          header: "Anno",
          getFilterText: (r) => r.yearLabel,
          cellClassName: "font-semibold",
          render: (r) => r.yearLabel,
        },
        {
          id: "fondo_apertura",
          header: "Fondo cassa apertura",
          getFilterText: (r) => r.openingLabel,
          render: (r) => r.openingLabel,
        },
        {
          id: "fondo_chiusura",
          header: "Fondo cassa chiusura",
          getFilterText: (r) => r.closingLabel,
          render: (r) => r.closingLabel,
        },
        {
          id: "sospesi",
          header: "Sospesi",
          getFilterText: (r) => r.suspendedLabel,
          render: (r) => r.suspendedLabel,
        },
        {
          id: "master",
          header: "Master",
          getFilterText: (r) => r.masterLabel,
          render: (r) => r.masterLabel,
        },
        {
          id: "lay",
          header: "LAY",
          getFilterText: (r) => r.layLabel,
          render: (r) => r.layLabel,
        },
        {
          id: "commissioni",
          header: "Commissioni",
          getFilterText: (r) => r.commissionLabel,
          render: (r) => r.commissionLabel,
        },
        {
          id: "prelievi",
          header: "Prelievi",
          getFilterText: (r) => r.withdrawalLabel,
          render: (r) => r.withdrawalLabel,
        },
        {
          id: "chiuso",
          header: "Chiuso il",
          getFilterText: (r) => r.closedAtLabel,
          render: (r) => r.closedAtLabel,
        },
        {
          id: "actions",
          header: "",
          filterable: false,
          getFilterText: () => "",
          render: (r) => <ReopenYearButton year={r.year} />,
        },
      ]}
    />
  );
}
