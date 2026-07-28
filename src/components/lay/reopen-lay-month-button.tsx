"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { reopenLayMonthAction } from "@/lib/actions";
import { Button } from "@/components/ui";

export function ReopenLayMonthButton({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      disabled={pending}
      className="!px-2 !py-1 text-xs text-amber-800"
      onClick={() => {
        if (
          !confirm(
            `Riaprire ${month}/${year}?\n\n` +
              `Si riaprono LAY e Tris di quel mese.\n` +
              `I movimenti restano; l'archivio viene rimosso.`,
          )
        )
          return;
        startTransition(async () => {
          const result = await reopenLayMonthAction(year, month);
          if (result && "error" in result && result.error) alert(result.error);
          else alert(`Mese ${month}/${year} riaperto (LAY + Tris).`);
          router.refresh();
        });
      }}
    >
      {pending ? "..." : "Riapri mese"}
    </Button>
  );
}
