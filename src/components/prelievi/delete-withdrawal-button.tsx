"use client";

import { deleteWithdrawalAction } from "@/lib/actions";
import { DeleteMovementButton } from "@/components/forms/delete-button";

export function DeleteWithdrawalButton({ id }: { id: string }) {
  return <DeleteMovementButton id={id} action={async () => deleteWithdrawalAction(id)} />;
}
