import Link from "next/link";
import { Card } from "@/components/ui";

const REPORTS = [
  { href: "/api/export/backup", label: "Backup completo Excel", highlight: true },
  { href: "/api/export/sospesi", label: "Sospesi (CSV)" },
  { href: "/api/export/master", label: "Master (CSV)" },
  { href: "/api/export/commissioni", label: "Commissioni (CSV)" },
  { href: "/api/export/lay", label: "LAY (CSV)" },
  { href: "/api/export/prelievi", label: "Prelievi (CSV)" },
  { href: "/api/export/rendiconto", label: "Rendiconto (CSV)" },
];

export default function ReportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Report</h1>
        <p className="text-sm text-slate-500">
          Backup Excel completo · esportazioni CSV per sezione
        </p>
      </div>

      <Card title="Backup manuale consigliato">
        <p className="mb-3 text-sm text-slate-600">
          Un solo file Excel con tutte le sezioni: clienti, sospesi, master, commissioni, LAY,
          prelievi, fondo cassa, rendiconto, snapshot e archivi. Utile prima di chiudere un anno o
          dopo modifiche importanti.
        </p>
        <a
          href="/api/export/backup"
          className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Scarica backup Excel completo
        </a>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Card key={r.href} title={r.label}>
            <Link
              href={r.href}
              className={
                r.highlight
                  ? "text-sm font-medium text-emerald-700 hover:underline"
                  : "text-sm text-emerald-600 hover:underline"
              }
            >
              Scarica →
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
