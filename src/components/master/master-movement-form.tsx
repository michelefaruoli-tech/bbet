"use client";

import { saveMasterMovementAction } from "@/lib/actions";
import { MovementForm, DateField, AmountField } from "@/components/forms/movement-form";

export function MasterMovementForm() {
  return (
    <MovementForm action={saveMasterMovementAction}>
      <DateField />
      <div className="field">
        <label>Ora</label>
        <input name="time" placeholder="HH:MM" />
      </div>
      <div className="field">
        <label>Tipo</label>
        <select name="movementType" defaultValue="PAGAMENTO" id="master-type">
          <option value="PAGAMENTO">Avere (+) — Master deve a noi</option>
          <option value="RICARICA">Dare (−) — noi dobbiamo a loro</option>
          <option value="BONUS">Dare (−) — bonus / uscita</option>
          <option value="RETTIFICA">Rettifica</option>
          <option value="ALTRO">Altro</option>
        </select>
      </div>
      <div className="field">
        <label>Segno</label>
        <select name="sign" defaultValue="positive" id="master-sign">
          <option value="positive">Avere (+)</option>
          <option value="negative">Dare (−)</option>
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
