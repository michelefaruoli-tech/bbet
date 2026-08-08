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
  previewBalance,
}: {
  year: number;
  month: number;
  alreadyClosed?: boolean;
  previewBalance?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (alreadyClosed) return null;

  const label = `${MONTH_LABELS[month - 1]} ${year}`;
  const balanceHint =
    previewBalance === undefined
      ? ""
      : `\nSaldo mese da archiviare: ${previewBalance.toFixed(2).replace(".", ",")} €`;

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            `Chiudere ${label}?${balanceHint}\n\n` +
              `Verranno archiviati insieme:\n` +
              `• mese LAY\n` +
              `• rendiconto Tris\n\n` +
              `Se c’erano mesi successivi già chiusi (es. saltati), verranno riaperti.\n` +
              `In caso di errore potrai riaprire il mese.`,
          )
        )
          return;
        startTransition(async () => {
          const result = await closeLayMonthAction(year, month);
          if (result && "reopenedLater" in result && result.reopenedLater?.length) {
            alert(
              `${label} chiuso.\n\nRiaperti i mesi successivi: ${result.reopenedLater.join(", ")}.\n` +
                `Puoi richiuderli dopo, in ordine.`,
            );
          }
          router.refresh();
        });
      }}
    >
      {pending ? "Chiusura..." : `Chiudi ${label} (LAY + Tris)`}
    </Button>
  );
}
