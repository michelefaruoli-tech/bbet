import { prisma } from "@/lib/prisma";
import { formatEUR } from "@/lib/format";
import { formatDateIT } from "@/lib/timezone";
import { Card } from "@/components/ui";
import { CloseYearButton } from "@/components/archivio/close-year-button";
import { ArchivesTable, type ArchiveRow } from "@/components/archivio/archives-table";

export default async function ArchivioPage() {
  const archives = await prisma.annualArchive.findMany({ orderBy: { year: "desc" } });
  const year = new Date().getFullYear();
  const alreadyClosed = archives.some((a) => a.year === year);

  const archiveRows: ArchiveRow[] = archives.map((a) => ({
    id: a.id,
    year: a.year,
    yearLabel: String(a.year),
    openingLabel: formatEUR(a.openingCashFund),
    closingLabel: formatEUR(a.closingCashFund),
    suspendedLabel: formatEUR(a.suspendedBalance),
    masterLabel: formatEUR(a.masterBalance),
    layLabel: formatEUR(a.layBalance),
    commissionLabel: formatEUR(a.commissionTotal),
    withdrawalLabel: formatEUR(a.withdrawalTotal),
    closedAtLabel: formatDateIT(a.closedAt),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Archivio annuale</h1>
          <p className="text-sm text-slate-500">
            Chiusura 31/12 · Riporto fondo cassa · Possibilità di riaprire se sbagli · Backup Excel
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/export/backup"
            className="inline-flex items-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
          >
            Backup Excel completo
          </a>
          {!alreadyClosed && <CloseYearButton year={year} />}
        </div>
      </div>

      <Card title="Regole chiusura anno">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
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
        <p className="mb-3 text-sm text-slate-600">
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
        <ArchivesTable rows={archiveRows} />
      </Card>
    </div>
  );
}
