"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatDateIT } from "@/lib/timezone";
import { Button } from "@/components/ui";

type Props = {
  action: (formData: FormData) => Promise<{ success?: boolean; error?: string }>;
  fields?: React.ReactNode;
  children?: React.ReactNode;
  defaults?: Record<string, string>;
  hidden?: Record<string, string>;
  onSuccessPath?: string;
};

export function MovementForm({ action, fields, children, defaults = {}, hidden = {}, onSuccessPath }: Props) {
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
        Object.entries(hidden).forEach(([k, v]) => fd.set(k, v));
        startTransition(async () => {
          setError("");
          setMessage("");
          try {
            const result = await action(fd);
            if (result?.error) {
              setError(result.error);
              return;
            }
            setMessage("Salvato");
            setDirty(false);
            form.reset();
            router.refresh();
            if (onSuccessPath) router.push(onSuccessPath);
          } catch {
            setError("Errore durante il salvataggio");
          }
        });
      }}
    >
      {children ?? fields}
      <div className="md:col-span-2 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!dirty || pending}>
          {pending ? "Salvataggio..." : "Salva"}
        </Button>
        {message && <span className="text-sm text-accent">{message}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

export function DateField({ name = "date", defaultValue }: { name?: string; defaultValue?: string }) {
  return (
    <div className="field">
      <label>Data (GG/MM/AAAA)</label>
      <input
        name={name}
        required
        placeholder="GG/MM/AAAA"
        defaultValue={defaultValue ?? formatDateIT(new Date())}
      />
    </div>
  );
}

export function AmountField({ name = "amount" }: { name?: string }) {
  return (
    <div className="field">
      <label>Importo (€)</label>
      <input name={name} required placeholder="0,00" />
    </div>
  );
}
