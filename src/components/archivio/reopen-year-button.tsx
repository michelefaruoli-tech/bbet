"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { reopenYearAction } from "@/lib/actions";
import { Button } from "@/components/ui";

export function ReopenYearButton({ year }: { year: number }) {
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
            `Riaprire l'anno ${year}?\n\n` +
              `• L'archivio annuale ${year} viene rimosso\n` +
              `• I mesi Commissioni ${year} tornano modificabili\n` +
              `• I dati (movimenti, saldi) NON vengono cancellati\n\n` +
              `Usa questa funzione solo se hai chiuso per errore.`,
          )
        ) {
          return;
        }
        startTransition(async () => {
          const result = await reopenYearAction(year);
          if (result?.error) alert(result.error);
          else alert(`Anno ${year} riaperto.`);
          router.refresh();
        });
      }}
    >
      {pending ? "..." : "Riapri"}
    </Button>
  );
}
