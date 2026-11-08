"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createUserAction } from "@/lib/actions";
import { Button } from "@/components/ui";

export function CreateUserForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          setError("");
          setOk("");
          const result = await createUserAction(fd);
          if (result && "error" in result && result.error) {
            setError(result.error);
            return;
          }
          setOk("Utente creato");
          (e.target as HTMLFormElement).reset();
          router.refresh();
        });
      }}
    >
      <div className="field">
        <label>Nome</label>
        <input name="name" required placeholder="Mario Rossi" />
      </div>
      <div className="field">
        <label>Email</label>
        <input name="email" type="email" required placeholder="mario@bbet.local" />
      </div>
      <div className="field">
        <label>Password (min. 6)</label>
        <input name="password" type="password" required minLength={6} />
      </div>
      <div className="md:col-span-2">
        <p className="mb-2 text-xs text-muted">
          Per ora Master e Collaboratore hanno gli stessi poteri operativi. Il Master in più vede
          chi ha inserito/modificato i dati e gestisce le utenze.
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? "Creazione..." : "Crea utenza"}
        </Button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {ok && <p className="mt-2 text-sm text-accent-dark">{ok}</p>}
      </div>
    </form>
  );
}
