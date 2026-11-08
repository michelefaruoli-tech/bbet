"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { login } from "@/lib/auth-client";
import { Button } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await login(
            String(fd.get("email")),
            String(fd.get("password")),
          );
          if (result.error) {
            setError(result.error);
            return;
          }
          router.push("/");
          router.refresh();
        });
      }}
    >
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}
      <div>
        <label htmlFor="login-email" className="mb-1.5 block text-[13px] font-medium text-muted">Email</label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="inp w-full"
          placeholder="nome@azienda.it"
        />
      </div>
      <div>
        <label htmlFor="login-password" className="mb-1.5 block text-[13px] font-medium text-muted">Password</label>
        <input
          id="login-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="inp w-full"
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Accesso..." : "Accedi"}
      </Button>
    </form>
  );
}
