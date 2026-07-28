"use client";

import { deleteLayMovementAction } from "@/lib/actions";
import { DeleteMovementButton } from "@/components/forms/delete-button";

export function DeleteLayButton({ id }: { id: string }) {
  return <DeleteMovementButton id={id} action={async () => deleteLayMovementAction(id)} />;
}
