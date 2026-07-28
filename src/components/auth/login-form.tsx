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
        <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
        <input
          name="email"
          type="email"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="admin@bbet.local"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
        <input
          name="password"
          type="password"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Accesso..." : "Accedi"}
      </Button>
    </form>
  );
}
