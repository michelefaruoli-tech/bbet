"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toggleUserActiveAction } from "@/lib/actions";
import { Button } from "@/components/ui";

export function ToggleUserButton({
  userId,
  active,
}: {
  userId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={active ? "danger" : "secondary"}
      className="!px-2 !py-1 text-xs"
      disabled={pending}
      onClick={() => {
        if (!confirm(active ? "Disattivare questo utente?" : "Riattivare questo utente?")) return;
        startTransition(async () => {
          const result = await toggleUserActiveAction(userId);
          if (result && "error" in result && result.error) alert(result.error);
          router.refresh();
        });
      }}
    >
      {pending ? "..." : active ? "Disattiva" : "Riattiva"}
    </Button>
  );
}
