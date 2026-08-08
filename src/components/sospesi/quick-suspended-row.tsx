"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveSuspendedMovementAction } from "@/lib/actions";
import { formatDateIT, formatTimeIT } from "@/lib/timezone";
import { Button } from "@/components/ui";

export function QuickSuspendedRow({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [type, setType] = useState<"DARE" | "AVERE">("DARE");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const today = formatDateIT(new Date());

  return (
    <form
      className="flex flex-wrap items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!amount.trim()) return;
        const fd = new FormData();
        fd.set("customerId", customerId);
        fd.set("date", today);
        fd.set("time", formatTimeIT());
        fd.set("movementType", type);
        fd.set("amount", amount);
        startTransition(async () => {
          setError("");
          setMessage("");
          try {
            await saveSuspendedMovementAction(fd);
            setAmount("");
            setMessage("OK");
            router.refresh();
            setTimeout(() => setMessage(""), 2000);
          } catch {
            setError("Errore");
          }
        });
      }}
    >
      <select
        value={type}
        onChange={(e) => setType(e.target.value as "DARE" | "AVERE")}
        className="w-24 rounded border border-slate-300 px-1 py-1 text-xs"
        title="Tipo movimento"
      >
        <option value="DARE">Inviati</option>
        <option value="AVERE">Ricevuti</option>
      </select>
      <input
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="€"
        className="w-20 rounded border border-slate-300 px-1.5 py-1 text-xs"
        title="Importo"
      />
      <Button type="submit" disabled={pending || !amount.trim()} className="!px-2 !py-1 text-xs">
        {pending ? "..." : "Salva"}
      </Button>
      {message && <span className="text-xs text-emerald-600">{message}</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
