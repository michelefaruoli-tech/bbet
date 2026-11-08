"use client";

import { useState, useTransition } from "react";
import { changePasswordAction } from "@/lib/actions";
import { Button } from "@/components/ui";

export function ChangePasswordForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  return (
    <form
      className="form-grid max-w-xl"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          setError("");
          setOk("");
          const result = await changePasswordAction(fd);
          if (result && "error" in result && result.error) {
            setError(result.error);
            return;
          }
          setOk("Password aggiornata con successo");
          (e.target as HTMLFormElement).reset();
        });
      }}
    >
      <div className="field md:col-span-2">
        <label>Password attuale</label>
        <input name="currentPassword" type="password" required autoComplete="current-password" />
      </div>
      <div className="field">
        <label>Nuova password (min. 6)</label>
        <input
          name="newPassword"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>
      <div className="field">
        <label>Conferma nuova password</label>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvataggio..." : "Cambia password"}
        </Button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {ok && <p className="mt-2 text-sm text-accent-dark">{ok}</p>}
      </div>
    </form>
  );
}
