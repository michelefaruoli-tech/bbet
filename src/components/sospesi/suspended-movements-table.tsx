"use client";

import { FilterableTable } from "@/components/table/filterable-table";
import { DeleteSuspendedButton } from "@/components/sospesi/delete-suspended-button";
import { amountClass, formatEUR } from "@/lib/format";

export type SuspendedMovementRow = {
  id: string;
  customerId: string;
  dateTimeLabel: string;
  tipo: string;
  amount: number;
  amountLabel: string;
  description: string;
  userName: string;
  periodLabel: string;
  isOpenPeriod: boolean;
};

export function SuspendedMovementsTable({
  rows,
  customerId,
}: {
  rows: SuspendedMovementRow[];
  customerId: string;
}) {
  return (
    <FilterableTable
      rows={rows}
      tableClassName="data-table"
      getRowKey={(r) => r.id}
      getRowClassName={(r) => (r.isOpenPeriod ? "" : "opacity-80")}
      emptyMessage="Nessun movimento registrato"
      columns={[
        {
          id: "periodo",
          header: "Periodo",
          getFilterText: (r) => r.periodLabel,
          render: (r) => (
            <span className={r.isOpenPeriod ? "text-emerald-800 font-medium" : "text-slate-600"}>
              {r.periodLabel}
            </span>
          ),
        },
        {
          id: "datetime",
          header: "Data / ora",
          getFilterText: (r) => r.dateTimeLabel,
          cellClassName: "whitespace-nowrap",
          render: (r) => r.dateTimeLabel,
        },
        {
          id: "tipo",
          header: "Tipo",
          getFilterText: (r) => r.tipo,
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
          render: (r) => <DeleteSuspendedButton id={r.id} customerId={customerId} />,
        },
      ]}
    />
  );
}
