"use client";

import { deleteMasterMovementAction } from "@/lib/actions";
import { DeleteMovementButton } from "@/components/forms/delete-button";

export function DeleteMasterButton({ id }: { id: string }) {
  return <DeleteMovementButton id={id} action={async () => deleteMasterMovementAction(id)} />;
}
