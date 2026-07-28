"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { closeLayMonthAction } from "@/lib/actions";
import { Button } from "@/components/ui";

const MONTH_LABELS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export function CloseLayMonthButton({
  year,
  month,
  alreadyClosed = false,
}: {
  year: number;
  month: number;
  alreadyClosed?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (alreadyClosed) return null;

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            `Chiudere ${MONTH_LABELS[month - 1]} ${year}?\n\n` +
              `Verranno archiviati insieme:\n` +
              `• mese LAY\n` +
              `• rendiconto Tris\n\n` +
              `In caso di errore potrai riaprire il mese.`,
          )
        )
          return;
        startTransition(async () => {
          await closeLayMonthAction(year, month);
          router.refresh();
        });
      }}
    >
      {pending ? "Chiusura..." : `Chiudi mese ${month}/${year} (LAY + Tris)`}
    </Button>
  );
}
