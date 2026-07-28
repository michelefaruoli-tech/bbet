"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resetUserPasswordAction } from "@/lib/actions";
import { Button } from "@/components/ui";

export function ResetUserPasswordForm({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        className="!px-2 !py-1 text-xs"
        onClick={() => {
          setError("");
          setOk("");
          setOpen(true);
        }}
      >
        Cambia password
      </Button>
    );
  }

  return (
    <form
      className="min-w-[14rem] space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("userId", userId);
        startTransition(async () => {
          setError("");
          setOk("");
          const result = await resetUserPasswordAction(fd);
          if (result && "error" in result && result.error) {
            setError(result.error);
            return;
          }
          setOk("Password aggiornata");
          (e.target as HTMLFormElement).reset();
          router.refresh();
          setTimeout(() => setOpen(false), 1200);
        });
      }}
    >
      <p className="text-xs font-medium text-slate-700">{userName}</p>
      <input
        name="newPassword"
        type="password"
        required
        minLength={6}
        placeholder="Nuova password"
        className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
        autoComplete="new-password"
      />
      <input
        name="confirmPassword"
        type="password"
        required
        minLength={6}
        placeholder="Conferma"
        className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
        autoComplete="new-password"
      />
      <div className="flex flex-wrap gap-1">
        <Button type="submit" disabled={pending} className="!px-2 !py-1 text-xs">
          {pending ? "..." : "Salva"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="!px-2 !py-1 text-xs"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Annulla
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {ok && <p className="text-xs text-emerald-700">{ok}</p>}
    </form>
  );
}
