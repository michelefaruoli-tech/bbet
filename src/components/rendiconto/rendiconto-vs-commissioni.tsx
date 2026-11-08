import Link from "next/link";
import { formatEUR, amountClass } from "@/lib/format";
import { cn } from "@/lib/cn";

type Breakdown = {
  commissioniAnnuali: number;
  fondoCassa: number;
  prelievi: number;
};

/**
 * Confronto principale:
 * - Totale Rendiconto (scheda dettagliata)
 * - Totale da Commissioni = Commissioni annuali + Fondo cassa − Prelievi
 */
export function RendicontoVsCommissioni({
  rendicontoTotal,
  commissioniSaldo,
  difference,
  breakdown,
  size = "lg",
}: {
  rendicontoTotal: number;
  commissioniSaldo: number;
  /** Differenza = Commissioni − Rendiconto (positiva = mancano soldi) */
  difference: number;
  breakdown?: Breakdown;
  size?: "lg" | "md";
}) {
  const aligned = difference === 0;
  const moneyOk = difference <= 0;
  const big = size === "lg";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border-2 shadow-md",
        moneyOk ? "border-emerald-500" : "border-amber-500",
      )}
    >
      <div
        className={cn(
          "px-4 py-2 text-center text-xs font-bold uppercase tracking-wider text-white",
          moneyOk ? "bg-emerald-600" : "bg-amber-600",
        )}
      >
        {aligned
          ? "Allineati — quadratura ok"
          : difference < 0
            ? "Soldi in più rispetto alle Commissioni"
            : "Attenzione — mancano soldi rispetto alle Commissioni"}
      </div>

      <div className="grid gap-0 bg-white md:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <Link
          href="/cassa/conta"
          className={cn(
            "block bg-slate-900 px-5 text-white transition hover:bg-slate-800",
            big ? "py-6" : "py-4",
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
            Totale Rendiconto (scheda)
          </p>
          <p
            className={cn(
              "mt-1 font-black tabular-nums",
              big ? "text-4xl sm:text-5xl" : "text-3xl",
              rendicontoTotal >= 0 ? "text-emerald-300" : "text-rose-300",
            )}
          >
            {formatEUR(rendicontoTotal)}
          </p>
          <p className="mt-2 text-xs text-muted">
            Manuali + Sospesi + Master + LAY + Tris →
          </p>
        </Link>

        <div className="hidden items-center justify-center bg-slate-100 px-2 text-2xl font-bold text-muted md:flex">
          ↔
        </div>

        <Link
          href="/cassa"
          className={cn(
            "block bg-amber-50 px-5 transition hover:bg-amber-100",
            big ? "py-6" : "py-4",
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Totale da Commissioni
          </p>
          <p
            className={cn(
              "mt-1 font-black tabular-nums text-amber-950",
              big ? "text-4xl sm:text-5xl" : "text-3xl",
            )}
          >
            {formatEUR(commissioniSaldo)}
          </p>
          {breakdown ? (
            <p className="mt-2 text-xs text-amber-800">
              {formatEUR(breakdown.commissioniAnnuali)} + {formatEUR(breakdown.fondoCassa)} −{" "}
              {formatEUR(breakdown.prelievi)}
            </p>
          ) : (
            <p className="mt-2 text-xs text-amber-700">
              Commissioni + Fondo cassa − Prelievi →
            </p>
          )}
        </Link>

        <div className="hidden items-center justify-center bg-slate-100 px-2 text-2xl font-bold text-muted md:flex">
          =
        </div>

        <div
          className={cn(
            "px-5",
            big ? "py-6" : "py-4",
            moneyOk ? "bg-accent-soft" : "bg-amber-50",
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Differenza
          </p>
          <p
            className={cn(
              "mt-1 font-black tabular-nums",
              big ? "text-4xl sm:text-5xl" : "text-3xl",
              amountClass(difference),
            )}
          >
            {formatEUR(difference)}
          </p>
          <p className="mt-2 text-xs text-muted">
            Commissioni − Rendiconto
            {difference > 0 && " · mancano soldi"}
            {difference < 0 && " · soldi in più"}
            {aligned && " · ok"}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Blocco grande: i 3 pezzi + totale (dato principale Commissioni) */
export function CommissioniTotaleBreakdown({
  year,
  commissioniAnnuali,
  fondoCassa,
  prelievi,
  totale,
}: {
  year: number;
  commissioniAnnuali: number;
  fondoCassa: number;
  prelievi: number;
  totale: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-amber-500 bg-white shadow-md">
      <div className="bg-amber-600 px-4 py-2 text-center text-xs font-bold uppercase tracking-wider text-white">
        Totale Rendiconto da Commissioni {year} — dato principale
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-3">
        <div className="rounded-xl border-2 border-emerald-300 bg-accent-soft px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-dark">
            1 · Totale Commissioni annuale
          </p>
          <p className="mt-1 text-3xl font-black tabular-nums text-emerald-950">
            {formatEUR(commissioniAnnuali)}
          </p>
          <p className="mt-1 text-xs text-accent-dark">Fatture + Bonus dell’anno</p>
        </div>

        <div className="rounded-xl border-2 border-sky-400 bg-sky-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
            2 · Fondo cassa (fisso)
          </p>
          <p className="mt-1 text-3xl font-black tabular-nums text-sky-950">
            {formatEUR(fondoCassa)}
          </p>
          <p className="mt-1 text-xs text-sky-700">
            Chiusura annuale anno precedente · resta come fondo
          </p>
        </div>

        <div className="rounded-xl border-2 border-rose-300 bg-rose-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-800">
            3 · Prelievi (si tolgono)
          </p>
          <p className="mt-1 text-3xl font-black tabular-nums text-rose-700">
            − {formatEUR(prelievi)}
          </p>
          <p className="mt-1 text-xs text-rose-700">
            Si gestiscono in{" "}
            <a href="/cassa/prelievi" className="font-semibold underline">
              Prelievi
            </a>
            , qui solo il totale
          </p>
        </div>
      </div>

      <div className="border-t-2 border-amber-300 bg-amber-50 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
          = Totale (Commissioni + Fondo cassa − Prelievi)
        </p>
        <p className="mt-1 text-5xl font-black tabular-nums text-amber-950">
          {formatEUR(totale)}
        </p>
        <p className="mt-2 text-sm text-amber-900">
          {formatEUR(commissioniAnnuali)} + {formatEUR(fondoCassa)} − {formatEUR(prelievi)} ={" "}
          <strong>{formatEUR(totale)}</strong>
        </p>
      </div>
    </div>
  );
}
