"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveCustomerAction } from "@/lib/actions";
import { Button } from "@/components/ui";

type Props = {
  customer?: {
    id: string;
    name: string;
    surname: string;
    phone?: string | null;
    notes?: string | null;
  };
};

export function CustomerForm({ customer }: Props) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="form-grid"
      onChange={() => setDirty(true)}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        if (customer?.id) fd.set("id", customer.id);
        startTransition(async () => {
          setError("");
          setMessage("");
          try {
            await saveCustomerAction(fd);
            setMessage("Salvato con successo");
            setDirty(false);
            router.refresh();
          } catch {
            setError("Errore durante il salvataggio");
          }
        });
      }}
    >
      <div className="field">
        <label>Nome</label>
        <input name="name" required defaultValue={customer?.name ?? ""} />
      </div>
      <div className="field">
        <label>Cognome / Denominazione</label>
        <input name="surname" required defaultValue={customer?.surname ?? ""} />
      </div>
      <div className="field">
        <label>Telefono</label>
        <input name="phone" defaultValue={customer?.phone ?? ""} />
      </div>
      <div className="field md:col-span-2">
        <label>Note</label>
        <textarea name="notes" defaultValue={customer?.notes ?? ""} />
      </div>
      <div className="md:col-span-2 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!dirty || pending}>
          {pending ? "Salvataggio..." : "Salva cambiamenti"}
        </Button>
        {message && <span className="text-sm text-emerald-600">{message}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}
