import { formatDateTimeIT } from "@/lib/timezone";
import { Card } from "@/components/ui";

type HistoryEntry = {
  id: string;
  action: string;
  createdAt: Date;
  user: { name: string };
  entityId: string | null;
  newValue: string | null;
};

const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

function describeChange(entry: HistoryEntry): string {
  if (!entry.newValue) return entry.action;
  try {
    const data = JSON.parse(entry.newValue) as { month?: number; year?: number; invoiceAmount?: string; bonusAmount?: string; finalTotal?: string };
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

export function CommissionHistory({ entries }: { entries: HistoryEntry[] }) {
  return (
    <Card title="Storico modifiche">
      <div className="max-h-64 overflow-y-auto">
        <table className="data-table text-sm">
          <thead>
            <tr>
              <th>Data</th>
              <th>Utente</th>
              <th>Dettaglio</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap">{formatDateTimeIT(e.createdAt)}</td>
                <td>{e.user.name}</td>
                <td>{describeChange(e)}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-muted">
                  Nessuna modifica registrata ancora
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
