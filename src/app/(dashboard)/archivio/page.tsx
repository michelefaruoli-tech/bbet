import { prisma } from "@/lib/prisma";
import { formatEUR } from "@/lib/format";
import { formatDateIT } from "@/lib/timezone";
import { Card } from "@/components/ui";
import { CloseYearButton } from "@/components/archivio/close-year-button";
import { ReopenYearButton } from "@/components/archivio/reopen-year-button";

export default async function ArchivioPage() {
  const archives = await prisma.annualArchive.findMany({ orderBy: { year: "desc" } });
  const year = new Date().getFullYear();
  const alreadyClosed = archives.some((a) => a.year === year);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Archivio annuale</h1>
          <p className="text-sm text-muted">
            Chiusura 31/12 · Riporto fondo cassa · Possibilità di riaprire se sbagli · Backup Excel
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/export/backup"
            className="inline-flex items-center rounded-lg border border-emerald-300 bg-accent-soft px-3 py-2 text-sm font-medium text-accent-dark hover:bg-emerald-100"
          >
            Backup Excel completo
          </a>
          {!alreadyClosed && <CloseYearButton year={year} />}
        </div>
      </div>

      <Card title="Regole chiusura anno">
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Riporta: fondo cassa finale, crediti Sospesi, saldo Master, saldo LAY cumulativo</li>
          <li>Azzera: fatture, bonus, commissioni mensili, prelievi annuali del nuovo esercizio</li>
          <li>Lo storico degli anni precedenti non viene eliminato</li>
          <li>
            Se chiudi per errore: usa <strong>Riapri</strong> sulla riga dell’anno — i mesi Commissioni
            tornano modificabili e i movimenti restano
          </li>
        </ul>
      </Card>

      <Card title="Backup manuale">
        <p className="mb-3 text-sm text-muted">
          Scarica un unico file Excel con tutti i dati BBET (clienti, sospesi, master, commissioni,
          LAY, prelievi, rendiconto, archivi). Consigliato prima di chiudere un anno.
        </p>
        <a
          href="/api/export/backup"
          className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Scarica backup Excel
        </a>
      </Card>

      <Card title="Anni archiviati">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Anno</th>
                <th>Fondo cassa apertura</th>
                <th>Fondo cassa chiusura</th>
                <th>Sospesi</th>
                <th>Master</th>
                <th>LAY</th>
                <th>Commissioni</th>
                <th>Prelievi</th>
                <th>Chiuso il</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {archives.map((a) => (
                <tr key={a.id}>
                  <td className="font-semibold">{a.year}</td>
                  <td>{formatEUR(a.openingCashFund)}</td>
                  <td>{formatEUR(a.closingCashFund)}</td>
                  <td>{formatEUR(a.suspendedBalance)}</td>
                  <td>{formatEUR(a.masterBalance)}</td>
                  <td>{formatEUR(a.layBalance)}</td>
                  <td>{formatEUR(a.commissionTotal)}</td>
                  <td>{formatEUR(a.withdrawalTotal)}</td>
                  <td>{formatDateIT(a.closedAt)}</td>
                  <td>
                    <ReopenYearButton year={a.year} />
                  </td>
                </tr>
              ))}
              {archives.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-muted">
                    Nessun anno archiviato. Quando chiudi {year}, comparirà qui con il bottone Riapri.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
