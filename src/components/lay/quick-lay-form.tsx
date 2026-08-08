"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveLayMovementAction } from "@/lib/actions";
import { formatDateIT } from "@/lib/timezone";
import { Button } from "@/components/ui";

export function QuickLayForm({ trisBalance = 0 }: { trisBalance?: number }) {
  const router = useRouter();
  // LAY: Avere = operazioni positive · Dare = operazioni negative
  const [type, setType] = useState<"AVERE" | "DARE">("AVERE");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [trisActive, setTrisActive] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const today = formatDateIT(new Date());

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        <strong>Tris</strong>: saldo attuale{" "}
        <span
          className={
            trisBalance >= 0 ? "font-semibold text-amber-700" : "font-semibold text-emerald-700"
          }
        >
          {trisBalance.toLocaleString("it-IT", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          €
        </span>
        {trisBalance >= 0 ? " (quanto devi)" : " (loro devono a te)"}. Con{" "}
        <strong>Tris attivo</strong>: <strong>Avere (+)</strong> riduce il debito,{" "}
        <strong>Dare (−)</strong> lo aumenta.
      </p>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!amount.trim()) return;
          const fd = new FormData();
          fd.set("date", today);
          // Avere = + · Dare = −
          fd.set("sign", type === "AVERE" ? "positive" : "negative");
          fd.set("amount", amount);
          fd.set("notes", notes);
          fd.set("trisActive", trisActive ? "true" : "false");
          if (trisActive) fd.set("category", "TRIS");

          startTransition(async () => {
            setError("");
            setMessage("");
            try {
              await saveLayMovementAction(fd);
              setAmount("");
              setNotes("");
              if (trisActive) {
                setMessage(
                  type === "AVERE"
                    ? "Salvato · Avere: saldo Tris ridotto"
                    : "Salvato · Dare: saldo Tris aumentato",
                );
              } else {
                setMessage("Salvato (solo LAY, senza Tris)");
              }
              router.refresh();
              setTimeout(() => setMessage(""), 3500);
            } catch {
              setError("Errore salvataggio");
            }
          });
        }}
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "AVERE" | "DARE")}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="AVERE">Avere (+)</option>
            <option value="DARE">Dare (−)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Importo</label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="min-w-[10rem] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">Note</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Opzionale"
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={trisActive}
            onChange={(e) => setTrisActive(e.target.checked)}
            className="rounded border-slate-300"
          />
          <span>
            <span className="font-medium text-violet-900">Tris attivo</span>
            <span className="block text-xs text-violet-700">Scala credito + aggiorna Rendiconto</span>
          </span>
        </label>
        <Button type="submit" disabled={pending || !amount.trim()}>
          {pending ? "Salvo..." : "Salva"}
        </Button>
        <span className="text-xs text-slate-400">Data automatica: {today}</span>
        {message && <span className="text-sm text-emerald-600">{message}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </form>
    </div>
  );
}
