"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveTrisPlayAction } from "@/lib/actions";
import { formatEUR } from "@/lib/format";
import { cn } from "@/lib/cn";

function todayISO() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts;
}

function parseAmount(v: string) {
  const n = Number(v.trim().replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : Math.abs(n);
}

/**
 * Nuova giocata Tris. Dare = il debito verso il Tris sale · Avere = il debito scende.
 * `trisBalance` è il saldo attuale del conto Tris (negativo = gli devi), per mostrare l'effetto.
 */
export function TrisPlayForm({ trisBalance, compact = false }: { trisBalance: number; compact?: boolean }) {
  const router = useRouter();
  const [type, setType] = useState<"DARE" | "AVERE">("DARE");
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const value = parseAmount(amount);
  const after = Math.round((trisBalance + (type === "AVERE" ? value : -value)) * 100) / 100;
  const afterText =
    Math.abs(after) < 0.005 ? "in pari" : after < 0 ? `gli dovrai ${formatEUR(-after)}` : `il Tris ti dovrà ${formatEUR(after)}`;

  return (
    <form
      className={cn("flex flex-wrap items-end gap-4", !compact && "rounded-xl border border-line bg-white px-6 py-5")}
      onSubmit={(e) => {
        e.preventDefault();
        if (!value) {
          setError("Inserisci un importo");
          return;
        }
        const fd = new FormData();
        fd.set("playType", type);
        fd.set("date", date);
        fd.set("amount", amount);
        fd.set("notes", notes);
        startTransition(async () => {
          setError("");
          setMessage("");
          const res = await saveTrisPlayAction(fd);
          if (res && "error" in res && res.error) {
            setError(String(res.error));
            return;
          }
          setAmount("");
          setNotes("");
          setMessage("Giocata salvata · conto Tris aggiornato");
          router.refresh();
          setTimeout(() => setMessage(""), 3000);
        });
      }}
    >
      <div className="flex flex-[0_1_170px] flex-col gap-1.5">
        <label htmlFor="tris-date" className="text-[13px] font-medium text-muted">
          Data
        </label>
        <input id="tris-date" type="date" className="inp" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <fieldset className="flex flex-[0_1_240px] flex-col gap-1.5">
        <legend className="mb-1.5 text-[13px] font-medium text-muted">Tipo</legend>
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-pressed={type === "DARE"}
            onClick={() => setType("DARE")}
            className={cn(
              "inp flex-1 font-semibold",
              type === "DARE" ? "border-minus bg-minus-soft text-minus-dark" : "text-muted",
            )}
          >
            Dare
          </button>
          <button
            type="button"
            aria-pressed={type === "AVERE"}
            onClick={() => setType("AVERE")}
            className={cn("inp flex-1 font-semibold", type === "AVERE" ? "border-plus bg-plus-soft text-plus" : "text-muted")}
          >
            Avere
          </button>
        </div>
      </fieldset>
      <div className="flex flex-[0_1_150px] flex-col gap-1.5">
        <label htmlFor="tris-amount" className="text-[13px] font-medium text-muted">
          Importo €
        </label>
        <input
          id="tris-amount"
          className="inp text-right tnum"
          inputMode="decimal"
          placeholder="0,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="flex flex-[1_1_200px] flex-col gap-1.5">
        <label htmlFor="tris-notes" className="text-[13px] font-medium text-muted">
          Nota
        </label>
        <input
          id="tris-notes"
          className="inp"
          placeholder="es. giocata sabato"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-[10px] bg-accent px-6 text-[15px] font-semibold text-white hover:bg-accent-dark disabled:opacity-50"
      >
        {pending ? "Salvo…" : "Salva giocata"}
      </button>
      <p className="w-full text-sm text-muted" aria-live="polite">
        {type === "DARE" ? "Dare: il debito verso il Tris sale." : "Avere: il debito verso il Tris scende."}
        {value > 0 && <> Dopo il salvataggio: <strong className="text-ink">{afterText}</strong>.</>}
        {message && <span className="ml-2 font-semibold text-accent">{message}</span>}
        {error && <span className="ml-2 font-semibold text-red-700">{error}</span>}
      </p>
    </form>
  );
}
