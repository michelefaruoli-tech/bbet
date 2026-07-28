"use client";

import { saveLayMovementAction } from "@/lib/actions";
import { MovementForm, DateField, AmountField } from "@/components/forms/movement-form";

export function LayMovementForm() {
  return (
    <MovementForm action={saveLayMovementAction}>
      <DateField />
      <div className="field">
        <label>Ora</label>
        <input name="time" placeholder="HH:MM" />
      </div>
      <div className="field">
        <label>Tipo</label>
        <select name="sign" defaultValue="positive">
          <option value="positive">Avere (+)</option>
          <option value="negative">Dare (−)</option>
        </select>
      </div>
      <AmountField />
      <div className="field md:col-span-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="trisActive" value="true" defaultChecked />
          Tris attivo (scala credito Tris e aggiorna il Rendiconto)
        </label>
      </div>
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
