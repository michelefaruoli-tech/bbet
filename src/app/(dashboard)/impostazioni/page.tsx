import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isMaster, roleLabel } from "@/lib/roles";
import { formatDateTimeIT } from "@/lib/timezone";
import { Card, Badge } from "@/components/ui";
import { CreateUserForm } from "@/components/impostazioni/create-user-form";
import { ToggleUserButton } from "@/components/impostazioni/toggle-user-button";
import { ChangePasswordForm } from "@/components/impostazioni/change-password-form";
import { ResetUserPasswordForm } from "@/components/impostazioni/reset-user-password-form";

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
            <div className="overflow-x-auto">
              <table className="data-table text-sm">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Ruolo</th>
                    <th>Stato</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="font-medium">{u.name}</td>
                      <td>{u.email}</td>
                      <td>{roleLabel(u.role)}</td>
                      <td>
                        <Badge tone={u.active ? "ok" : "danger"}>
                          {u.active ? "Attivo" : "Disattivo"}
                        </Badge>
                      </td>
                      <td className="space-y-2">
                        {u.id !== session.id && (
                          <ToggleUserButton userId={u.id} active={u.active} />
                        )}
                        {u.id !== session.id && u.role === "OPERATOR" && (
                          <ResetUserPasswordForm userId={u.id} userName={u.name} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Ultime modifiche (chi ha fatto cosa)">
            <p className="mb-3 text-sm text-slate-500">
              Visibile solo al Master · ultime 50 operazioni registrate
            </p>
            <div className="overflow-x-auto">
              <table className="data-table text-sm">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Utente</th>
                    <th>Azione</th>
                    <th>Sezione</th>
                    <th>ID</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((a) => (
                    <tr key={a.id}>
                      <td className="whitespace-nowrap">{formatDateTimeIT(a.createdAt)}</td>
                      <td className="font-medium">{a.user.name}</td>
                      <td>{a.action}</td>
                      <td>{a.entityType}</td>
                      <td className="max-w-[8rem] truncate text-xs text-slate-400">
                        {a.entityId ?? "—"}
                      </td>
                    </tr>
                  ))}
                  {audit.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400">
                        Nessuna modifica registrata
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
