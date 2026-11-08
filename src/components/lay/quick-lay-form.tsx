"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveLayMovementAction } from "@/lib/actions";
import { formatTimeIT } from "@/lib/timezone";
import { cn } from "@/lib/cn";

function todayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Movimento LAY: + Entrata / − Uscita. Il Tris non passa più da qui. */
export function QuickLayForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className={cn("flex flex-wrap items-end gap-4", !compact && "rounded-xl border border-line bg-card px-6 py-5")}
      onSubmit={(e) => {
        e.preventDefault();
        if (!amount.trim()) return;
        const fd = new FormData();
        fd.set("date", date);
        fd.set("time", formatTimeIT());
        fd.set("sign", type === "IN" ? "positive" : "negative");
        fd.set("amount", amount);
        fd.set("notes", notes);
        startTransition(async () => {
          setError("");
          setMessage("");
          try {
            await saveLayMovementAction(fd);
            setAmount("");
            setNotes("");
            setMessage("Salvato");
            router.refresh();
            setTimeout(() => setMessage(""), 2500);
          } catch {
            setError("Non salvato");
          }
        });
      }}
    >
      <div className="flex flex-[0_1_170px] flex-col gap-1.5">
        <label htmlFor="lay-date" className="text-[13px] font-medium text-muted">
          Data
        </label>
        <input id="lay-date" type="date" className="inp" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <fieldset className="flex flex-[0_1_250px] flex-col">
        <legend className="mb-1.5 text-[13px] font-medium text-muted">Tipo</legend>
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-pressed={type === "IN"}
            onClick={() => setType("IN")}
            className={cn("inp flex-1 font-semibold", type === "IN" ? "border-plus bg-plus-soft text-plus" : "text-muted")}
          >
            + Entrata
          </button>
          <button
            type="button"
            aria-pressed={type === "OUT"}
            onClick={() => setType("OUT")}
            className={cn(
              "inp flex-1 font-semibold",
              type === "OUT" ? "border-minus bg-minus-soft text-minus-dark" : "text-muted",
            )}
          >
            − Uscita
          </button>
        </div>
      </fieldset>
      <div className="flex flex-[0_1_150px] flex-col gap-1.5">
        <label htmlFor="lay-amount" className="text-[13px] font-medium text-muted">
          Importo €
        </label>
        <input
          id="lay-amount"
          className="inp text-right tnum"
          inputMode="decimal"
          placeholder="0,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="flex flex-[1_1_200px] flex-col gap-1.5">
        <label htmlFor="lay-notes" className="text-[13px] font-medium text-muted">
          Nota
        </label>
        <input
          id="lay-notes"
          className="inp"
          placeholder="es. partita serale"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={pending || !amount.trim()}
        className="min-h-11 rounded-[10px] bg-accent px-6 text-[15px] font-semibold text-white hover:bg-accent-dark disabled:opacity-50"
      >
        {pending ? "Salvo…" : "Salva"}
      </button>
      <span aria-live="polite" className="w-full text-sm">
        {message && <span className="font-semibold text-accent">{message}</span>}
        {error && <span className="font-semibold text-red-700">{error}</span>}
      </span>
    </form>
  );
}
