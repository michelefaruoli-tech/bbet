"use client";

import { deleteTrisPlayAction } from "@/lib/actions";
import { DeleteMovementButton } from "@/components/forms/delete-button";

export function DeleteTrisPlayButton({ id }: { id: string }) {
  return <DeleteMovementButton id={id} action={deleteTrisPlayAction} />;
}
