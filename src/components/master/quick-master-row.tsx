"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveMasterMovementAction } from "@/lib/actions";
import { formatDateIT } from "@/lib/timezone";
import { Button } from "@/components/ui";

export function QuickMasterRow() {
  const router = useRouter();
  // Avere (+) = Master deve a noi · Dare (−) = noi a loro
  const [type, setType] = useState<"AVERE" | "DARE">("AVERE");
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
        fd.set("date", today);
        fd.set("movementType", type === "AVERE" ? "PAGAMENTO" : "RICARICA");
        fd.set("sign", type === "AVERE" ? "positive" : "negative");
        fd.set("amount", amount);
        startTransition(async () => {
          setError("");
          setMessage("");
          try {
            await saveMasterMovementAction(fd);
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
        onChange={(e) => setType(e.target.value as "AVERE" | "DARE")}
        className="w-24 rounded border border-slate-300 px-1 py-1 text-xs"
        title="Tipo movimento"
      >
        <option value="AVERE">Avere (+)</option>
        <option value="DARE">Dare (−)</option>
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
      {message && <span className="text-xs text-accent">{message}</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
