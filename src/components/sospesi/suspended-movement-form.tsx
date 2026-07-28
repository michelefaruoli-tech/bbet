"use client";

import { saveSuspendedMovementAction } from "@/lib/actions";
import { MovementForm, DateField, AmountField } from "@/components/forms/movement-form";

export function SuspendedMovementForm({ customerId }: { customerId: string }) {
  return (
    <MovementForm action={saveSuspendedMovementAction} hidden={{ customerId }}>
      <DateField />
      <div className="field">
        <label>Ora (facoltativa)</label>
        <input name="time" placeholder="HH:MM" />
      </div>
      <div className="field">
        <label>Tipo movimento</label>
        <select name="movementType" required defaultValue="DARE">
          <option value="DARE">Inviati (anticipo al cliente)</option>
          <option value="AVERE">Ricevuti (restituzione cliente)</option>
        </select>
      </div>
      <AmountField />
      <div className="field md:col-span-2">
        <label>Descrizione</label>
        <input name="description" />
      </div>
      <div className="field md:col-span-2">
        <label>Note</label>
        <textarea name="notes" />
      </div>
    </MovementForm>
  );
}
