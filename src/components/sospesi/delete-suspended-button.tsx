"use client";

import { deleteSuspendedMovementAction } from "@/lib/actions";
import { DeleteMovementButton } from "@/components/forms/delete-button";

export function DeleteSuspendedButton({ id, customerId }: { id: string; customerId: string }) {
  return (
    <DeleteMovementButton
      id={id}
      action={async () => deleteSuspendedMovementAction(id, customerId)}
    />
  );
}
