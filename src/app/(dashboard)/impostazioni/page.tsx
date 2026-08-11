import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isMaster, roleLabel } from "@/lib/roles";
import { formatDateTimeIT } from "@/lib/timezone";
import { Card } from "@/components/ui";
import { CreateUserForm } from "@/components/impostazioni/create-user-form";
import { ChangePasswordForm } from "@/components/impostazioni/change-password-form";
import {
  AuditLogTable,
  UsersTable,
  type AuditRow,
  type UserRow,
} from "@/components/impostazioni/settings-tables";

export default async function ImpostazioniPage() {
  const session = await requireSession();
  const master = isMaster(session.role);

  const users = master
    ? await prisma.user.findMany({ orderBy: { createdAt: "asc" } })
    : [];

  const audit = master
    ? await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { name: true, email: true } } },
      })
    : [];

  const userRows: UserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    roleLabel: roleLabel(u.role),
    active: u.active,
    statusLabel: u.active ? "Attivo" : "Disattivo",
    isSelf: u.id === session.id,
  }));

  const auditRows: AuditRow[] = audit.map((a) => ({
    id: a.id,
    whenLabel: formatDateTimeIT(a.createdAt),
    userName: a.user.name,
    action: a.action,
    entityType: a.entityType,
    entityId: a.entityId ?? "—",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Impostazioni</h1>
        <p className="text-sm text-slate-500">Account, utenze e (per Master) chi ha modificato cosa</p>
      </div>

      <Card title="Utente corrente">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Nome</dt>
            <dd className="font-medium">{session.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium">{session.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Ruolo</dt>
            <dd className="font-medium">{roleLabel(session.role)}</dd>
          </div>
        </dl>
      </Card>

      <Card title="Cambia password">
        <p className="mb-3 text-sm text-slate-500">
          Puoi aggiornare la tua password in qualsiasi momento. Disponibile per Master e
          Collaboratori.
        </p>
        <ChangePasswordForm />
      </Card>

      {master && (
        <>
          <Card title="Crea nuova utenza">
            <CreateUserForm />
          </Card>

          <Card title="Elenco utenze">
            <UsersTable rows={userRows} sessionUserId={session.id} />
          </Card>

          <Card title="Ultime modifiche (chi ha fatto cosa)">
            <p className="mb-3 text-sm text-slate-500">
              Visibile solo al Master · ultime 50 operazioni registrate
            </p>
            <AuditLogTable rows={auditRows} />
          </Card>
        </>
      )}

      {!master && (
        <Card title="Permessi">
          <p className="text-sm text-slate-600">
            Sei un <strong>Collaboratore</strong>: puoi usare tutte le sezioni operative. Solo il{" "}
            <strong>Master</strong> crea utenze e vede chi ha inserito o modificato i dati.
          </p>
        </Card>
      )}
    </div>
  );
}
