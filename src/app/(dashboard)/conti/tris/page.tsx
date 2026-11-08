import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getTrisAccount } from "@/lib/calculations-server";
import { formatEUR, toNumber } from "@/lib/format";
import { formatMovementDateTime } from "@/lib/timezone";
import { BalanceText, Card, PageHeader, Tabs } from "@/components/ui";
import { TrisPlayForm } from "@/components/tris/tris-play-form";
import { DeleteTrisPlayButton } from "@/components/tris/delete-tris-play-button";
import { CONTI_TABS } from "@/components/layout/sections";

export const dynamic = "force-dynamic";

const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
const MONTHS_LONG = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export default async function GiocateTrisPage() {
  const [tris, closures] = await Promise.all([
    getTrisAccount(),
    prisma.trisMonthlyClosure.findMany({ orderBy: [{ year: "desc" }, { month: "desc" }] }),
  ]);

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const monthPlays = tris.plays.filter((p) => {
    const d = new Date(p.date);
    return d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m;
  });
  const dare = monthPlays.filter((p) => p.playType === "DARE").reduce((s, p) => s + toNumber(p.amount), 0);
  const avere = monthPlays.filter((p) => p.playType === "AVERE").reduce((s, p) => s + toNumber(p.amount), 0);
  const effect = dare - avere; // + = il debito sale

  return (
    <>
      <PageHeader title="Conti">
        <Tabs items={CONTI_TABS} active="/conti/tris" label="Scegli conto" />
      </PageHeader>

      <section className="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-minus-line bg-minus-soft px-6 py-5">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-minus-dark">Conto Tris nei Sospesi</span>
          <BalanceText value={tris.balance} perspective="tris" className="text-[30px]" />
          <span className="text-sm text-[#3F3F46]">
            Ogni giocata che salvi qui aggiorna da sola questo saldo. I soldi dati o ricevuti li registri nel conto Tris
            dei Sospesi.
          </span>
        </div>
        {tris.account && (
          <Link
            href={`/clienti/${tris.account.id}`}
            className="inline-flex min-h-11 items-center rounded-[10px] bg-ink px-5 font-semibold text-white hover:bg-black"
          >
            Apri conto Tris
          </Link>
        )}
      </section>

      <TrisPlayForm trisBalance={tris.balance} />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-white p-5">
          <span className="text-[13px] font-medium text-muted">{MONTHS_LONG[m - 1]} · Dare</span>
          <div className="text-2xl font-bold text-minus-dark tnum">{formatEUR(dare)}</div>
        </div>
        <div className="rounded-xl border border-line bg-white p-5">
          <span className="text-[13px] font-medium text-muted">{MONTHS_LONG[m - 1]} · Avere</span>
          <div className="text-2xl font-bold text-plus tnum">{formatEUR(avere)}</div>
        </div>
        <div className="rounded-xl border border-line bg-white p-5">
          <span className="text-[13px] font-medium text-muted">Effetto sul conto Tris</span>
          <div className={`text-2xl font-bold tnum ${effect > 0 ? "text-minus-dark" : effect < 0 ? "text-plus" : ""}`}>
            {Math.abs(effect) < 0.005
              ? "nessuno"
              : effect > 0
                ? `debito +${formatEUR(effect)}`
                : `debito −${formatEUR(-effect)}`}
          </div>
        </div>
      </section>

      <Card title="Giocate">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Tipo</th>
                <th>Nota</th>
                <th className="!text-right">Importo</th>
                <th>Chi</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tris.plays.slice(0, 100).map((p) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap text-[13px] text-muted">
                    {formatMovementDateTime(p.date, p.time, p.createdAt)}
                  </td>
                  <td className={p.playType === "DARE" ? "font-semibold text-minus-dark" : "font-semibold text-plus"}>
                    {p.playType === "DARE" ? "Dare" : "Avere"}
                  </td>
                  <td>{p.notes ?? "—"}</td>
                  <td className="text-right font-semibold">{formatEUR(p.amount)}</td>
                  <td className="text-[13px] text-muted">{p.createdBy.name}</td>
                  <td>
                    <DeleteTrisPlayButton id={p.id} />
                  </td>
                </tr>
              ))}
              {tris.plays.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted">
                    Nessuna giocata ancora. Le giocate registrate prima del passaggio sono nello storico LAY.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {closures.length > 0 && (
        <Card title="Mese per mese">
          <p className="mb-3 text-[13px] text-muted">
            I mesi si chiudono da soli il 1° del mese dopo, insieme al LAY. Fino a ottobre 2026 le giocate erano dentro il
            LAY: i loro totali restano qui come storico.
          </p>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mese</th>
                  <th className="!text-right">Dare</th>
                  <th className="!text-right">Avere</th>
                  <th>Debito a fine mese</th>
                </tr>
              </thead>
              <tbody>
                {closures.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {MONTHS[c.month - 1]} {c.year}
                    </td>
                    <td className="text-right text-minus-dark">{formatEUR(c.dareTotal)}</td>
                    <td className="text-right text-plus">{formatEUR(c.avereTotal)}</td>
                    <td>
                      <BalanceText value={-toNumber(c.cumulativeBalance)} perspective="tris" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
