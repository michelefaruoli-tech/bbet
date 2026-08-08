"use client";

import { useState } from "react";
import { Card, Button } from "@/components/ui";
import { CustomerForm } from "@/components/sospesi/customer-form";

/** Scheda “Nuovo cliente” chiusa di default: si apre solo se serve. */
export function NewCustomerPanel() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="flex justify-end">
        <Button
          type="button"
          variant="primary"
          onClick={() => setOpen(true)}
          className="!bg-emerald-600 !px-5 !py-2.5 !text-base !font-semibold shadow-md ring-2 ring-emerald-300 hover:!bg-emerald-700"
        >
          + Nuovo cliente
        </Button>
      </div>
    );
  }

  return (
    <Card
      title="Nuovo cliente"
      action={
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
        >
          Chiudi
        </button>
      }
    >
      <CustomerForm />
    </Card>
  );
}
