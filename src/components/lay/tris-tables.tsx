"use client";

import { FilterableTable } from "@/components/table/filterable-table";
import { DeleteLayButton } from "@/components/lay/delete-lay-button";
import { amountClass, formatEUR } from "@/lib/format";

export type TrisArchiveRow = {
  id: string;
  monthLabel: string;
  avereLabel: string;
  dareLabel: string;
  monthBalanceLabel: string;
  monthBalance: number;
  cumulativeLabel: string;
  cumulative: number;
  movementCount: string;
  statusLabel: string;
};

export function TrisArchivesTable({ rows }: { rows: TrisArchiveRow[] }) {
  return (
    <FilterableTable
      rows={rows}
      tableClassName="data-table text-sm"
      getRowKey={(r) => r.id}
      emptyMessage="Nessun archivio mensile ancora"
      columns={[
        {
          id: "mese",
          header: "Mese",
          getFilterText: (r) => r.monthLabel,
          render: (r) => (
            <>
              {r.monthLabel}{" "}
              {r.statusLabel === "In corso" && (
                <span className="text-xs font-normal text-amber-700">(in corso)</span>
              )}
            </>
          ),
        },
        {
          id: "avere",
          header: "Avere (+)",
          getFilterText: (r) => r.avereLabel,
          cellClassName: "text-emerald-700",
          render: (r) => r.avereLabel,
        },
        {
          id: "dare",
          header: "Dare (−)",
          getFilterText: (r) => r.dareLabel,
          cellClassName: "text-amber-700",
          render: (r) => r.dareLabel,
        },
        {
          id: "saldo_mese",
          header: "Saldo mese",
          getFilterText: (r) => r.monthBalanceLabel,
          cellClassName: (r) => amountClass(r.monthBalance),
          render: (r) => r.monthBalanceLabel,
        },
        {
          id: "cumulativo",
          header: "Cumulativo (debito)",
          getFilterText: (r) => r.cumulativeLabel,
          cellClassName: (r) => amountClass(r.cumulative),
          render: (r) => r.cumulativeLabel,
        },
        {
          id: "mov",
          header: "Mov.",
          getFilterText: (r) => r.movementCount,
          render: (r) => r.movementCount,
        },
        {
          id: "stato",
          header: "Stato",
          getFilterText: (r) => r.statusLabel,
          render: (r) => r.statusLabel,
        },
      ]}
    />
  );
}

export type TrisMovementRow = {
  id: string;
  dateLabel: string;
  tipo: string;
  amount: number;
  amountLabel: string;
  runningLabel: string;
  runningBalance: number;
  notes: string;
  authorName?: string;
  authorDetail?: string;
};

export function TrisMovementsTable({
  rows,
  showAuthor,
}: {
  rows: TrisMovementRow[];
  showAuthor?: boolean;
}) {
  const columns = [
    {
      id: "data",
      header: "Data",
      getFilterText: (r: TrisMovementRow) => r.dateLabel,
      cellClassName: "whitespace-nowrap",
      render: (r: TrisMovementRow) => r.dateLabel,
    },
    {
      id: "tipo",
      header: "Tipo",
      getFilterText: (r: TrisMovementRow) => r.tipo,
      cellClassName: (r: TrisMovementRow) => amountClass(r.amount),
      render: (r: TrisMovementRow) => r.tipo,
    },
    {
      id: "importo",
      header: "Importo",
      getFilterText: (r: TrisMovementRow) => r.amountLabel,
      cellClassName: (r: TrisMovementRow) => amountClass(r.amount),
      render: (r: TrisMovementRow) => r.amountLabel,
    },
    {
      id: "saldo_dopo",
      header: "Saldo dopo",
      getFilterText: (r: TrisMovementRow) => r.runningLabel,
      cellClassName: (r: TrisMovementRow) => amountClass(r.runningBalance),
      render: (r: TrisMovementRow) => r.runningLabel,
    },
    {
      id: "note",
      header: "Note",
      getFilterText: (r: TrisMovementRow) => r.notes,
      cellClassName: "max-w-[14rem] truncate",
      render: (r: TrisMovementRow) => r.notes,
    },
    ...(showAuthor
      ? [
          {
            id: "autore",
            header: "Inserito da",
            getFilterText: (r: TrisMovementRow) => r.authorName ?? "—",
            cellClassName: "text-xs text-slate-600",
            render: (r: TrisMovementRow) => (
              <>
                {r.authorName}
                {r.authorDetail && (
                  <span className="mt-0.5 block text-slate-400">{r.authorDetail}</span>
                )}
              </>
            ),
          },
        ]
      : []),
    {
      id: "actions",
      header: "",
      filterable: false as const,
      getFilterText: () => "",
      render: (r: TrisMovementRow) => <DeleteLayButton id={r.id} />,
    },
  ];

  return (
    <FilterableTable
      rows={rows}
      columns={columns}
      tableClassName="data-table sospesi-table text-sm"
      getRowKey={(r) => r.id}
      getRowClassName={(_, i) =>
        `sospesi-row ${i % 2 === 0 ? "sospesi-row-even" : "sospesi-row-odd"}`
      }
      emptyMessage="Nessun movimento Tris ancora"
    />
  );
}
