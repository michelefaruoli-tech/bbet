"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { saveFinancialSnapshotAction } from "@/lib/actions";
import { Button } from "@/components/ui";

export function SnapshotButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      onClick={() => {
        if (!confirm("Salvare uno snapshot del rendiconto attuale?")) return;
        const fd = new FormData();
        fd.set("snapshotType", "MANUAL");
        startTransition(async () => {
          await saveFinancialSnapshotAction(fd);
          router.refresh();
        });
      }}
    >
      {pending ? "Salvataggio..." : "Salva snapshot"}
    </Button>
  );
}
