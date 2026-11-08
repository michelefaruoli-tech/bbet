"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveWithdrawalAction } from "@/lib/actions";
import { formatDateIT } from "@/lib/timezone";
import { Button } from "@/components/ui";

export function WithdrawalForm() {
  const router = useRouter();
  const [source, setSource] = useState<"COMMISSIONI" | "LAY">("COMMISSIONI");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const today = formatDateIT(new Date());
  const now = new Date();

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Il prelievo è sempre in <strong>contanti</strong> dalle <strong>Commissioni</strong>. La data è automatica (oggi).
        Per prelevare o depositare sulla cassa LAY usa il conto{" "}
        <Link href="/clienti/posta-conto-fisso" className="text-accent hover:underline">
          Posta
        </Link>{" "}
        nei Clienti.
      </p>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!amount.trim()) return;
          const fd = new FormData();
          fd.set("date", today);
          fd.set("year", String(now.getFullYear()));
          fd.set("month", String(now.getMonth() + 1));
          fd.set("source", source);
          fd.set("amount", amount);
          fd.set("destination", "Contanti");
          fd.set("linkedSection", source);
          fd.set("notes", notes);
          fd.set(
            "description",
            source === "COMMISSIONI"
              ? "Prelievo contanti da Commissioni"
              : "Prelievo contanti da LAY",
          );

          startTransition(async () => {
            setError("");
            setMessage("");
            try {
              const result = await saveWithdrawalAction(fd);
              if (result?.error) {
                setError(result.error);
                return;
              }
              setAmount("");
              setNotes("");
              setMessage(
                source === "COMMISSIONI"
                  ? "OK · Commissioni aggiornate"
                  : "OK · Saldo LAY aggiornato",
              );
              router.refresh();
              setTimeout(() => setMessage(""), 3000);
            } catch {
              setError("Errore salvataggio");
            }
          });
        }}
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Da dove</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as "COMMISSIONI" | "LAY")}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="COMMISSIONI">Commissioni</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Importo (€)</label>
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
          <label className="mb-1 block text-xs font-medium text-muted">Note (opzionale)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Es. prelievo cassa"
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <Button type="submit" disabled={pending || !amount.trim()}>
          {pending ? "Salvo..." : "Registra prelievo"}
        </Button>
        <span className="text-xs text-muted">Data: {today} · Destinazione: Contanti</span>
        {message && <span className="text-sm text-accent">{message}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </form>
    </div>
  );
}
