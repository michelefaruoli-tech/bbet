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
          variant="secondary"
          onClick={() => setOpen(true)}
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
          className="text-sm text-muted hover:text-ink hover:underline"
        >
          Chiudi
        </button>
      }
    >
      <CustomerForm />
    </Card>
  );
}
