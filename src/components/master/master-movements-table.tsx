"use client";

import { FilterableTable } from "@/components/table/filterable-table";
import { EditMasterNotes } from "@/components/master/edit-master-notes";
import { DeleteMasterButton } from "@/components/master/delete-master-button";
import { amountClass, formatEUR } from "@/lib/format";

export type MasterMovementRow = {
  id: string;
  dateLabel: string;
  tipo: string;
  movementType: string;
  amount: number;
  amountLabel: string;
  description: string;
  notes: string | null;
  authorName?: string;
};

export function MasterMovementsTable({
  rows,
  showAuthor,
}: {
  rows: MasterMovementRow[];
  showAuthor?: boolean;
}) {
  const columns = [
    {
      id: "data",
      header: "Data",
      getFilterText: (r: MasterMovementRow) => r.dateLabel,
      render: (r: MasterMovementRow) => r.dateLabel,
    },
    {
      id: "tipo",
      header: "Tipo",
      getFilterText: (r: MasterMovementRow) => r.tipo,
      cellClassName: (r: MasterMovementRow) => amountClass(r.amount),
      render: (r: MasterMovementRow) => r.tipo,
    },
    {
      id: "dettaglio",
      header: "Dettaglio",
      getFilterText: (r: MasterMovementRow) => r.movementType,
      cellClassName: "text-xs text-slate-500",
      render: (r: MasterMovementRow) => r.movementType,
    },
    {
      id: "importo",
      header: "Importo",
      getFilterText: (r: MasterMovementRow) => r.amountLabel,
      cellClassName: (r: MasterMovementRow) => amountClass(r.amount),
      render: (r: MasterMovementRow) => r.amountLabel,
    },
    {
      id: "descrizione",
      header: "Descrizione",
      getFilterText: (r: MasterMovementRow) => r.description,
      render: (r: MasterMovementRow) => r.description,
    },
    {
      id: "note",
      header: "Note",
      getFilterText: (r: MasterMovementRow) => r.notes ?? "—",
      render: (r: MasterMovementRow) => <EditMasterNotes id={r.id} initialNotes={r.notes} />,
    },
    ...(showAuthor
      ? [
          {
            id: "autore",
            header: "Inserito da",
            getFilterText: (r: MasterMovementRow) => r.authorName ?? "—",
            render: (r: MasterMovementRow) => r.authorName ?? "—",
          },
        ]
      : []),
    {
      id: "actions",
      header: "",
      filterable: false as const,
      getFilterText: () => "",
      render: (r: MasterMovementRow) => <DeleteMasterButton id={r.id} />,
    },
  ];

  return (
    <FilterableTable
      rows={rows}
      columns={columns}
      tableClassName="data-table sospesi-table"
      getRowKey={(r) => r.id}
      getRowClassName={(_, i) =>
        `sospesi-row ${i % 2 === 0 ? "sospesi-row-even" : "sospesi-row-odd"}`
      }
      emptyMessage="Nessun movimento registrato"
    />
  );
}

/** Ultime transazioni (pagina Master) — stesse colonne tranne azioni delete */
export function MasterRecentTransactionsTable({ rows }: { rows: MasterMovementRow[] }) {
  return (
    <FilterableTable
      rows={rows}
      tableClassName="data-table sospesi-table"
      getRowKey={(r) => r.id}
      getRowClassName={(_, i) =>
        `sospesi-row ${i % 2 === 0 ? "sospesi-row-even" : "sospesi-row-odd"}`
      }
      emptyMessage="Nessuna transazione ancora"
      columns={[
        {
          id: "data",
          header: "Data",
          getFilterText: (r) => r.dateLabel,
          render: (r) => r.dateLabel,
        },
        {
          id: "tipo",
          header: "Tipo",
          getFilterText: (r) => r.tipo,
          cellClassName: (r) => amountClass(r.amount),
          render: (r) => r.tipo,
        },
        {
          id: "importo",
          header: "Importo",
          getFilterText: (r) => r.amountLabel,
          cellClassName: (r) => amountClass(r.amount),
          render: (r) => r.amountLabel,
        },
        {
          id: "descrizione",
          header: "Descrizione",
          getFilterText: (r) => r.description,
          render: (r) => r.description,
        },
        {
          id: "note",
          header: "Note",
          getFilterText: (r) => r.notes ?? "—",
          render: (r) => <EditMasterNotes id={r.id} initialNotes={r.notes} />,
        },
      ]}
    />
  );
}
