"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { savePostaMovementAction } from "@/lib/actions";
import { formatTimeIT } from "@/lib/timezone";
import { cn } from "@/lib/cn";

/** Conto Posta: Dare = prelievo (LAY scende) · Avere = deposito (LAY sale). */
export function QuickPostaRow() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function save(type: "DARE" | "AVERE") {
    if (!amount.trim()) return;
    const fd = new FormData();
    fd.set("movementType", type);
    fd.set("amount", amount);
    fd.set("time", formatTimeIT());
    startTransition(async () => {
      setError("");
      setMessage("");
      const res = await savePostaMovementAction(fd);
      if (res && "error" in res && res.error) {
        setError(String(res.error));
        return;
      }
      setAmount("");
      setMessage(type === "AVERE" ? "Deposito salvato" : "Prelievo salvato");
      router.refresh();
      setTimeout(() => setMessage(""), 2500);
    });
  }

  const btn = "inline-flex min-h-9 items-center rounded-lg border bg-white px-3 text-[13px] font-semibold disabled:opacity-40";

  return (
    <form className="flex flex-wrap items-center justify-end gap-1.5" onSubmit={(e) => e.preventDefault()} aria-label="Registra per Posta">
      <input
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="€"
        aria-label="Importo"
        className="h-9 w-20 rounded-lg border border-[#D4D4CF] px-2 text-right text-sm tnum"
      />
      <button
        type="button"
        disabled={pending || !amount.trim()}
        onClick={() => save("DARE")}
        className={cn(btn, "border-minus-line text-minus-dark")}
        title="Prelievo: dai soldi a Posta, la cassa LAY scende"
      >
        Dare · prelievo
      </button>
      <button
        type="button"
        disabled={pending || !amount.trim()}
        onClick={() => save("AVERE")}
        className={cn(btn, "border-[#BFD0F7] text-plus")}
        title="Deposito: Posta mette soldi, la cassa LAY sale"
      >
        Avere · deposito
      </button>
      <span aria-live="polite" className="w-full text-right text-xs">
        {message && <span className="text-accent">{message}</span>}
        {error && <span className="text-red-700">{error}</span>}
      </span>
    </form>
  );
}
