"use client";

import Link from "next/link";
import { FilterableTable } from "@/components/table/filterable-table";
import { QuickSuspendedRow } from "@/components/sospesi/quick-suspended-row";
import { amountClass, formatEUR } from "@/lib/format";

export type SospesiCustomerRow = {
  id: string;
  name: string;
  surname: string;
  active: boolean;
  section: "aperto" | "zero";
  totalDare: number;
  totalAvere: number;
  balance: number;
  movementCount: number;
  lastLabel: string;
};

export function SospesiCustomersTable({ rows }: { rows: SospesiCustomerRow[] }) {
  const showSections = rows.some((r) => r.section === "aperto") && rows.some((r) => r.section === "zero");

  return (
    <FilterableTable
      rows={rows}
      tableClassName="data-table sospesi-table"
      getRowKey={(r) => r.id}
      getRowClassName={(r, i) =>
        `sospesi-row ${i % 2 === 0 ? "sospesi-row-even" : "sospesi-row-odd"}`
      }
      emptyMessage="Nessun cliente"
      prependRows={
        showSections ? (
          <>
            <tr className="sospesi-section bg-emerald-50">
              <td colSpan={8} className="py-2 text-sm font-semibold text-emerald-800">
                Usa i filtri colonna per restringere l&apos;elenco (es. sezione &quot;Saldo aperto&quot;)
              </td>
            </tr>
          </>
        ) : undefined
      }
      columns={[
        {
          id: "cliente",
          header: "Cliente",
          getFilterText: (r) => `${r.surname} ${r.name}`,
          render: (r) => (
            <>
              <div className="font-medium">
                {r.surname} {r.name}
              </div>
              {!r.active && <span className="text-xs text-amber-600">Archiviato</span>}
            </>
          ),
        },
        {
          id: "section",
          header: "Sezione",
          getFilterText: (r) => (r.section === "aperto" ? "Saldo aperto" : "Saldo 0"),
          render: (r) =>
            r.section === "aperto" ? (
              <span className="text-xs text-emerald-700">Saldo aperto</span>
            ) : (
              <span className="text-xs text-slate-500">Saldo 0</span>
            ),
        },
        {
          id: "inviati",
          header: "Inviati",
          getFilterText: (r) => formatEUR(r.totalDare),
          render: (r) => formatEUR(r.totalDare),
        },
        {
          id: "ricevuti",
          header: "Ricevuti",
          getFilterText: (r) => formatEUR(r.totalAvere),
          render: (r) => formatEUR(r.totalAvere),
        },
        {
          id: "saldo",
          header: "Saldo",
          getFilterText: (r) => formatEUR(r.balance),
          cellClassName: (r) => amountClass(r.balance),
          render: (r) => formatEUR(r.balance),
        },
        {
          id: "mov",
          header: "Mov.",
          getFilterText: (r) => String(r.movementCount),
          render: (r) => r.movementCount,
        },
        {
          id: "ultimo",
          header: "Ultimo",
          getFilterText: (r) => r.lastLabel,
          cellClassName: "whitespace-nowrap",
          render: (r) => r.lastLabel,
        },
        {
          id: "quick",
          header: "Inserimento rapido",
          filterable: false,
          getFilterText: () => "",
          render: (r) => <QuickSuspendedRow customerId={r.id} />,
        },
        {
          id: "actions",
          header: "",
          filterable: false,
          getFilterText: () => "",
          render: (r) => (
            <Link
              href={`/sospesi/${r.id}`}
              className="text-emerald-600 hover:underline text-sm whitespace-nowrap"
            >
              Scheda
            </Link>
          ),
        },
      ]}
    />
  );
}
