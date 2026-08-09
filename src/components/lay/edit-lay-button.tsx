"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { saveLayMovementAction } from "@/lib/actions";
import { formatNumber } from "@/lib/format";
import { formatDateIT } from "@/lib/timezone";
import { Button } from "@/components/ui";

export type EditableLayOperation = {
  id: string;
  date: Date | string;
  time: string | null;
  amount: unknown;
  category: string;
  description: string | null;
  notes: string | null;
};

export function EditLayButton({ operation }: { operation: EditableLayOperation }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const amount = Number(operation.amount);
  const absAmount = Math.abs(amount);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="!px-2 !py-1 text-xs"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        Modifica
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-lay-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setOpen(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 id="edit-lay-title" className="font-semibold text-slate-800">
                Modifica operazione
              </h3>
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-slate-800"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Chiudi
              </button>
            </div>

            <form
              className="form-grid p-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                fd.set("id", operation.id);
                startTransition(async () => {
                  setError("");
                  try {
                    const result = await saveLayMovementAction(fd);
                    if (!result?.success) {
                      setError("Errore durante il salvataggio");
                      return;
                    }
                    setOpen(false);
                    router.refresh();
                  } catch {
                    setError("Errore durante il salvataggio");
                  }
                });
              }}
            >
              <div className="field">
                <label>Data (GG/MM/AAAA)</label>
                <input
                  name="date"
                  required
                  defaultValue={formatDateIT(operation.date)}
                  placeholder="GG/MM/AAAA"
                />
              </div>
              <div className="field">
                <label>Ora</label>
                <input name="time" defaultValue={operation.time ?? ""} placeholder="HH:MM" />
              </div>
              <div className="field">
                <label>Tipo</label>
                <select name="sign" defaultValue={amount >= 0 ? "positive" : "negative"}>
                  <option value="positive">Avere (+)</option>
                  <option value="negative">Dare (−)</option>
                </select>
              </div>
              <div className="field">
                <label>Importo (€)</label>
                <input
                  name="amount"
                  required
                  defaultValue={formatNumber(absAmount)}
                  placeholder="0,00"
                />
              </div>
              <div className="field md:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="trisActive"
                    value="true"
                    defaultChecked={operation.category === "TRIS"}
                  />
                  Tris attivo (scala credito Tris e aggiorna il Rendiconto)
                </label>
              </div>
              <div className="field md:col-span-2">
                <label>Descrizione</label>
                <input name="description" defaultValue={operation.description ?? ""} />
              </div>
              <div className="field md:col-span-2">
                <label>Note</label>
                <textarea name="notes" defaultValue={operation.notes ?? ""} rows={3} />
              </div>

              <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={pending}>
                  {pending ? "Salvataggio..." : "Salva modifiche"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setOpen(false)}
                >
                  Annulla
                </Button>
                {error && <span className="text-sm text-red-600">{error}</span>}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
