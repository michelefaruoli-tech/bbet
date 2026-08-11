"use client";

import { FilterableTable } from "@/components/table/filterable-table";
import { Badge } from "@/components/ui";
import { ToggleUserButton } from "@/components/impostazioni/toggle-user-button";
import { ResetUserPasswordForm } from "@/components/impostazioni/reset-user-password-form";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  active: boolean;
  statusLabel: string;
  isSelf: boolean;
};

export function UsersTable({ rows, sessionUserId }: { rows: UserRow[]; sessionUserId: string }) {
  return (
    <FilterableTable
      rows={rows}
      tableClassName="data-table text-sm"
      getRowKey={(r) => r.id}
      emptyMessage="Nessuna utenza"
      columns={[
        {
          id: "nome",
          header: "Nome",
          getFilterText: (r) => r.name,
          cellClassName: "font-medium",
          render: (r) => r.name,
        },
        {
          id: "email",
          header: "Email",
          getFilterText: (r) => r.email,
          render: (r) => r.email,
        },
        {
          id: "ruolo",
          header: "Ruolo",
          getFilterText: (r) => r.roleLabel,
          render: (r) => r.roleLabel,
        },
        {
          id: "stato",
          header: "Stato",
          getFilterText: (r) => r.statusLabel,
          render: (r) => (
            <Badge tone={r.active ? "ok" : "danger"}>{r.statusLabel}</Badge>
          ),
        },
        {
          id: "azioni",
          header: "Azioni",
          filterable: false,
          getFilterText: () => "",
          render: (r) => (
            <div className="space-y-2">
              {r.id !== sessionUserId && <ToggleUserButton userId={r.id} active={r.active} />}
              {r.id !== sessionUserId && r.role === "OPERATOR" && (
                <ResetUserPasswordForm userId={r.id} userName={r.name} />
              )}
            </div>
          ),
        },
      ]}
    />
  );
}

export type AuditRow = {
  id: string;
  whenLabel: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
};

export function AuditLogTable({ rows }: { rows: AuditRow[] }) {
  return (
    <FilterableTable
      rows={rows}
      tableClassName="data-table text-sm"
      getRowKey={(r) => r.id}
      emptyMessage="Nessuna modifica registrata"
      columns={[
        {
          id: "quando",
          header: "Quando",
          getFilterText: (r) => r.whenLabel,
          cellClassName: "whitespace-nowrap",
          render: (r) => r.whenLabel,
        },
        {
          id: "utente",
          header: "Utente",
          getFilterText: (r) => r.userName,
          cellClassName: "font-medium",
          render: (r) => r.userName,
        },
        {
          id: "azione",
          header: "Azione",
          getFilterText: (r) => r.action,
          render: (r) => r.action,
        },
        {
          id: "sezione",
          header: "Sezione",
          getFilterText: (r) => r.entityType,
          render: (r) => r.entityType,
        },
        {
          id: "id",
          header: "ID",
          getFilterText: (r) => r.entityId,
          cellClassName: "max-w-[8rem] truncate text-xs text-slate-400",
          render: (r) => r.entityId,
        },
      ]}
    />
  );
}
