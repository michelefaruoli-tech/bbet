"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { closeTrisMonthAction } from "@/lib/actions";
import { Button } from "@/components/ui";

const MONTH_LABELS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export function CloseTrisMonthButton({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            `Archiviare il rendiconto Tris di ${MONTH_LABELS[month - 1]} ${year}?\n\n` +
              `Il saldo cumulativo Tris viene salvato nell'archivio mensile (separato da LAY).`,
          )
        )
          return;
        startTransition(async () => {
          const result = await closeTrisMonthAction(year, month);
          if (result && "error" in result && result.error) alert(result.error);
          router.refresh();
        });
      }}
    >
      {pending ? "Archivio..." : `Archivia Tris ${MONTH_LABELS[month - 1]}`}
    </Button>
  );
}
