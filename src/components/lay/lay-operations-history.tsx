"use client";

import { FilterableTable } from "@/components/table/filterable-table";
import { DeleteLayButton } from "@/components/lay/delete-lay-button";
import { EditLayButton } from "@/components/lay/edit-lay-button";
import { amountClass, formatEUR } from "@/lib/format";

const MONTH_LABELS = [
  "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
  "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
];

export type LayOperationRow = {
  id: string;
  date: Date | string;
  time: string | null;
  amount: unknown;
  category: string;
  description: string | null;
  notes: string | null;
  createdBy: { name: string };
  isOpenMonth: boolean;
};

type Props = {
  operations: LayOperationRow[];
  filterYear: string;
  filterMonth: string;
  showAuthor?: boolean;
};

function toDisplayRow(m: LayOperationRow) {
  const d = new Date(m.date);
  const amount = Number(m.amount);
  const isTris = m.category === "TRIS";
  const tipo = amount >= 0 ? "Avere" : "Dare";
  const dateLabel = `${d.toLocaleDateString("it-IT")}${m.time ? ` ${m.time}` : ""}`;
  const statoLabel = m.isOpenMonth
    ? "Mese aperto"
    : `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;

  return {
    id: m.id,
    raw: m,
    dateLabel,
    tipo,
    amount,
    amountLabel: formatEUR(Math.abs(amount)),
    trisLabel: isTris ? "Sì" : "No",
    statoLabel,
    notes: m.notes || m.description || "—",
    authorName: m.createdBy.name,
  };
}

export function LayOperationsHistory({
  operations,
  filterYear,
  filterMonth,
  showAuthor = false,
}: Props) {
  let prefiltered = operations;
  if (filterYear) {
    prefiltered = prefiltered.filter((m) => new Date(m.date).getFullYear() === Number(filterYear));
  }
  if (filterMonth) {
    prefiltered = prefiltered.filter((m) => new Date(m.date).getMonth() + 1 === Number(filterMonth));
  }

  const rows = prefiltered.map(toDisplayRow);

  const columns = [
    {
      id: "data",
      header: "Data",
      getFilterText: (r: (typeof rows)[0]) => r.dateLabel,
      cellClassName: "whitespace-nowrap",
      render: (r: (typeof rows)[0]) => r.dateLabel,
    },
    {
      id: "tipo",
      header: "Tipo",
      getFilterText: (r: (typeof rows)[0]) => r.tipo,
      cellClassName: (r: (typeof rows)[0]) => amountClass(r.amount),
      render: (r: (typeof rows)[0]) => r.tipo,
    },
    {
      id: "importo",
      header: "Importo",
      getFilterText: (r: (typeof rows)[0]) => r.amountLabel,
      cellClassName: (r: (typeof rows)[0]) => amountClass(r.amount),
      render: (r: (typeof rows)[0]) => r.amountLabel,
    },
    {
      id: "tris",
      header: "Tris",
      getFilterText: (r: (typeof rows)[0]) => r.trisLabel,
      render: (r: (typeof rows)[0]) =>
        r.trisLabel === "Sì" ? (
          <span className="rounded bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-800">
            Sì
          </span>
        ) : (
          <span className="text-xs text-slate-400">No</span>
        ),
    },
    {
      id: "stato",
      header: "Stato",
      getFilterText: (r: (typeof rows)[0]) => r.statoLabel,
      render: (r: (typeof rows)[0]) =>
        r.raw.isOpenMonth ? (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">Mese aperto</span>
        ) : (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{r.statoLabel}</span>
        ),
    },
    {
      id: "note",
      header: "Note",
      getFilterText: (r: (typeof rows)[0]) => r.notes,
      cellClassName: "max-w-[14rem] truncate",
      render: (r: (typeof rows)[0]) => r.notes,
    },
    ...(showAuthor
      ? [
          {
            id: "autore",
            header: "Inserito da",
            getFilterText: (r: (typeof rows)[0]) => r.authorName,
            render: (r: (typeof rows)[0]) => r.authorName,
          },
        ]
      : []),
    {
      id: "actions",
      header: "",
      filterable: false as const,
      getFilterText: () => "",
      render: (r: (typeof rows)[0]) => (
        <div className="flex flex-wrap items-center justify-end gap-1">
          <EditLayButton operation={r.raw} />
          <DeleteLayButton id={r.id} />
        </div>
      ),
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
      emptyMessage="Nessuna operazione per i filtri selezionati"
    />
  );
}
