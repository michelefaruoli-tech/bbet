"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateMasterNotesAction } from "@/lib/actions";
import { Button } from "@/components/ui";

export function EditMasterNotes({
  id,
  initialNotes,
}: {
  id: string;
  initialNotes: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  if (!editing) {
    return (
      <div className="flex max-w-[16rem] items-start gap-2">
        <span className="min-w-0 flex-1 truncate text-sm text-slate-700" title={initialNotes ?? ""}>
          {initialNotes?.trim() ? initialNotes : "—"}
        </span>
        <button
          type="button"
          className="shrink-0 text-xs text-accent-dark hover:underline"
          onClick={() => {
            setNotes(initialNotes ?? "");
            setEditing(true);
            setError("");
          }}
        >
          Modifica
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex min-w-[14rem] flex-col gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.set("id", id);
        fd.set("notes", notes);
        startTransition(async () => {
          setError("");
          const result = await updateMasterNotesAction(fd);
          if (result && "error" in result && result.error) {
            setError(result.error);
            return;
          }
          setEditing(false);
          router.refresh();
        });
      }}
    >
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm"
        placeholder="Note..."
        autoFocus
      />
      <div className="flex flex-wrap items-center gap-1">
        <Button type="submit" disabled={pending} className="!px-2 !py-1 text-xs">
          {pending ? "..." : "Salva"}
        </Button>
        <button
          type="button"
          className="text-xs text-muted hover:underline"
          disabled={pending}
          onClick={() => {
            setNotes(initialNotes ?? "");
            setEditing(false);
            setError("");
          }}
        >
          Annulla
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
