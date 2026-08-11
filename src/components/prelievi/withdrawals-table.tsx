"use client";

import { FilterableTable } from "@/components/table/filterable-table";
import { DeleteWithdrawalButton } from "@/components/prelievi/delete-withdrawal-button";
import { formatEUR } from "@/lib/format";

export type WithdrawalRow = {
  id: string;
  dateLabel: string;
  amountLabel: string;
  sourceLabel: string;
  destination: string;
  periodLabel: string;
  notes: string;
  userName: string;
};

export function WithdrawalsTable({ rows }: { rows: WithdrawalRow[] }) {
  return (
    <FilterableTable
      rows={rows}
      tableClassName="data-table sospesi-table"
      getRowKey={(r) => r.id}
      getRowClassName={(_, i) =>
        `sospesi-row ${i % 2 === 0 ? "sospesi-row-even" : "sospesi-row-odd"}`
      }
      emptyMessage="Nessun prelievo registrato quest'anno"
      columns={[
        {
          id: "data",
          header: "Data",
          getFilterText: (r) => r.dateLabel,
          render: (r) => r.dateLabel,
        },
        {
          id: "importo",
          header: "Importo",
          getFilterText: (r) => r.amountLabel,
          cellClassName: "font-medium",
          render: (r) => r.amountLabel,
        },
        {
          id: "da",
          header: "Da",
          getFilterText: (r) => r.sourceLabel,
          render: (r) =>
            r.sourceLabel === "LAY" ? (
              <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-800">LAY</span>
            ) : (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800">
                Commissioni
              </span>
            ),
        },
        {
          id: "destinazione",
          header: "Destinazione",
          getFilterText: (r) => r.destination,
          render: (r) => r.destination,
        },
        {
          id: "periodo",
          header: "Periodo",
          getFilterText: (r) => r.periodLabel,
          render: (r) => r.periodLabel,
        },
        {
          id: "note",
          header: "Note",
          getFilterText: (r) => r.notes,
          cellClassName: "max-w-[12rem] truncate",
          render: (r) => r.notes,
        },
        {
          id: "utente",
          header: "Utente",
          getFilterText: (r) => r.userName,
          render: (r) => r.userName,
        },
        {
          id: "actions",
          header: "",
          filterable: false,
          getFilterText: () => "",
          render: (r) => <DeleteWithdrawalButton id={r.id} />,
        },
      ]}
    />
  );
}
