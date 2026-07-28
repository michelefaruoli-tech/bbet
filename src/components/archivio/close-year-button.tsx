"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { closeYearAction } from "@/lib/actions";
import { Button } from "@/components/ui";

export function CloseYearButton({ year }: { year: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            `ATTENZIONE: confermi la chiusura dell'anno ${year}?\n\n` +
              `Consiglio: fai prima un Backup Excel completo (pulsante in questa pagina).\n\n` +
              `Se sbagli, potrai riaprire l'anno dalla tabella sotto.`,
          )
        )
          return;
        startTransition(async () => {
          const result = await closeYearAction(year);
          if (result?.error) alert(result.error);
          router.refresh();
        });
      }}
    >
      {pending ? "Chiusura..." : `Chiudi anno ${year}`}
    </Button>
  );
}
