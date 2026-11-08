"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveSuspendedMovementAction } from "@/lib/actions";
import { formatDateIT, formatTimeIT } from "@/lib/timezone";
import { cn } from "@/lib/cn";

/** Registrazione veloce dalla riga cliente: importo + Dare o Avere. */
export function QuickSuspendedRow({ customerId, name }: { customerId: string; name?: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function save(type: "DARE" | "AVERE") {
    if (!amount.trim()) return;
    const fd = new FormData();
    fd.set("customerId", customerId);
    fd.set("date", formatDateIT(new Date()));
    fd.set("time", formatTimeIT());
    fd.set("movementType", type);
    fd.set("amount", amount);
    startTransition(async () => {
      setError("");
      setMessage("");
      try {
        const res = await saveSuspendedMovementAction(fd);
        if (res && "error" in res && res.error) {
          setError(String(res.error));
          return;
        }
        setAmount("");
        setMessage(type === "DARE" ? "Dare salvato" : "Avere salvato");
        router.refresh();
        setTimeout(() => setMessage(""), 2500);
      } catch {
        setError("Non salvato");
      }
    });
  }

  const btn =
    "inline-flex min-h-9 items-center rounded-lg border bg-card px-3 text-[13px] font-semibold disabled:opacity-40";

  return (
    <form
      className="flex flex-wrap items-center justify-end gap-1.5"
      onSubmit={(e) => e.preventDefault()}
      aria-label={name ? `Registra per ${name}` : "Registra movimento"}
    >
      <input
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="€"
        aria-label="Importo"
        className="h-9 w-20 rounded-lg border border-field px-2 text-right text-sm tnum"
      />
      <button
        type="button"
        disabled={pending || !amount.trim()}
        onClick={() => save("DARE")}
        className={cn(btn, "border-minus-line text-minus-dark")}
      >
        + Dare
      </button>
      <button
        type="button"
        disabled={pending || !amount.trim()}
        onClick={() => save("AVERE")}
        className={cn(btn, "border-plus-line text-plus")}
      >
        + Avere
      </button>
      <span aria-live="polite" className="w-full text-right text-xs">
        {message && <span className="text-accent">{message}</span>}
        {error && <span className="text-red-700">{error}</span>}
      </span>
    </form>
  );
}
