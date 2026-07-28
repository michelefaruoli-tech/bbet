"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { reopenTrisMonthAction } from "@/lib/actions";
import { Button } from "@/components/ui";

export function ReopenTrisMonthButton({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      className="!px-2 !py-1 text-xs"
      onClick={() => {
        if (
          !confirm(
            `Riaprire il rendiconto Tris ${month}/${year}?\n\n` +
              `I movimenti restano; l'archivio di quel mese viene rimosso.`,
          )
        )
          return;
        startTransition(async () => {
          const result = await reopenTrisMonthAction(year, month);
          if (result?.error) alert(result.error);
          else alert(`Tris ${month}/${year} riaperto.`);
          router.refresh();
        });
      }}
    >
      {pending ? "..." : "Riapri mese"}
    </Button>
  );
}
