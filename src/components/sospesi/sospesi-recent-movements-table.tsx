"use client";

import Link from "next/link";
import { FilterableTable } from "@/components/table/filterable-table";
import { amountClass, formatEUR } from "@/lib/format";

export type SospesiRecentMovementRow = {
  id: string;
  customerId: string;
  customerLabel: string;
  dateTimeLabel: string;
  tipo: string;
  amount: number;
  amountLabel: string;
  description: string;
};

export function SospesiRecentMovementsTable({ rows }: { rows: SospesiRecentMovementRow[] }) {
  return (
    <FilterableTable
      rows={rows}
      tableClassName="data-table"
      getRowKey={(r) => r.id}
      emptyMessage="Nessun movimento ancora"
      columns={[
        {
          id: "datetime",
          header: "Data / ora",
          getFilterText: (r) => r.dateTimeLabel,
          cellClassName: "whitespace-nowrap",
          render: (r) => r.dateTimeLabel,
        },
        {
          id: "cliente",
          header: "Cliente",
          getFilterText: (r) => r.customerLabel,
          render: (r) => r.customerLabel,
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
          id: "actions",
          header: "",
          filterable: false,
          getFilterText: () => "",
          render: (r) => (
            <Link
              href={`/sospesi/${r.customerId}`}
              className="text-sm text-emerald-600 hover:underline whitespace-nowrap"
            >
              Scheda
            </Link>
          ),
        },
      ]}
    />
  );
}
