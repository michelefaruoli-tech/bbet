"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui";

export function DeleteMovementButton({
  id,
  label = "Elimina",
  action,
}: {
  id: string;
  label?: string;
  action: (id: string) => Promise<unknown>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (!confirm("Confermi l'eliminazione? L'operazione aggiornerà i totali.")) return;
        startTransition(async () => {
          await action(id);
          router.refresh();
        });
      }}
      className="!px-2 !py-1 text-xs"
    >
      {pending ? "..." : label}
    </Button>
  );
}
