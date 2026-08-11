"use client";

import { FilterableTable } from "@/components/table/filterable-table";
import { formatDateTimeIT } from "@/lib/timezone";

const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

type HistoryEntry = {
  id: string;
  action: string;
  createdAt: Date | string;
  user: { name: string };
  entityId: string | null;
  newValue: string | null;
};

function describeChange(entry: HistoryEntry): string {
  if (!entry.newValue) return entry.action;
  try {
    const data = JSON.parse(entry.newValue) as {
      month?: number;
      year?: number;
      invoiceAmount?: string;
      bonusAmount?: string;
      finalTotal?: string;
    };
    const mese = data.month ? MONTHS[data.month - 1] : "?";
    const anno = data.year ?? "";
    const fatt = data.invoiceAmount ? Number(data.invoiceAmount).toFixed(2) : "—";
    const bonus = data.bonusAmount ? Number(data.bonusAmount).toFixed(2) : "—";
    const finale = data.finalTotal ? Number(data.finalTotal).toFixed(2) : "—";
    return `${mese} ${anno} — Fatt ${fatt} · Bonus ${bonus} · Finale ${finale} €`;
  } catch {
    return entry.action;
  }
}

export function CommissionHistoryTable({ entries }: { entries: HistoryEntry[] }) {
  const rows = entries.map((e) => ({
    id: e.id,
    whenLabel: formatDateTimeIT(e.createdAt),
    userName: e.user.name,
    action: e.action,
    detail: describeChange(e),
  }));

  return (
    <div className="max-h-96 overflow-y-auto">
      <FilterableTable
        rows={rows}
        tableClassName="data-table text-sm"
        getRowKey={(r) => r.id}
        showActiveFilters={true}
        emptyMessage="Nessuna modifica registrata ancora"
        columns={[
          {
            id: "data",
            header: "Data",
            getFilterText: (r) => r.whenLabel,
            cellClassName: "whitespace-nowrap",
            render: (r) => r.whenLabel,
          },
          {
            id: "utente",
            header: "Utente",
            getFilterText: (r) => r.userName,
            render: (r) => r.userName,
          },
          {
            id: "dettaglio",
            header: "Dettaglio",
            getFilterText: (r) => r.detail,
            render: (r) => r.detail,
          },
        ]}
      />
    </div>
  );
}
