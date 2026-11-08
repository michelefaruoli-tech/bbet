"use client";

import { saveSuspendedMovementAction } from "@/lib/actions";
import { MovementForm, DateField, AmountField } from "@/components/forms/movement-form";
import { formatTimeIT } from "@/lib/timezone";

export function SuspendedMovementForm({
  customerId,
  isTris = false,
  isPosta = false,
}: {
  customerId: string;
  isTris?: boolean;
  isPosta?: boolean;
}) {
  return (
    <MovementForm action={saveSuspendedMovementAction} hidden={{ customerId }}>
      <DateField />
      <div className="field">
        <label>Ora</label>
        <input name="time" type="time" required defaultValue={formatTimeIT()} />
      </div>
      <div className="field">
        <label>Tipo</label>
        <select name="movementType" required defaultValue="DARE">
          {isPosta ? (
            <>
              <option value="DARE">Dare · prelievo (dai soldi a Posta, la cassa LAY scende)</option>
              <option value="AVERE">Avere · deposito (Posta mette soldi, la cassa LAY sale)</option>
            </>
          ) : isTris ? (
            <>
              <option value="DARE">Dare · soldi dati al Tris (il debito scende)</option>
              <option value="AVERE">Avere · soldi ricevuti dal Tris (il debito sale)</option>
            </>
          ) : (
            <>
              <option value="DARE">Dare · hai dato soldi al cliente (il suo debito sale)</option>
              <option value="AVERE">Avere · il cliente ti ha pagato (il debito scende)</option>
            </>
          )}
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
