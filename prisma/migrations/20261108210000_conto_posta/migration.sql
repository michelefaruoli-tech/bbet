-- Conto fisso "Posta" nei Sospesi, collegato alla cassa LAY.
-- I suoi movimenti sono movimenti LAY con categoria POSTA:
--   Avere = deposito (Posta mette soldi, il LAY sale)
--   Dare  = prelievo (dai soldi a Posta, il LAY scende)
-- Il saldo del conto Posta è il contrario del saldo LAY: niente cambia nella quadratura.

-- AlterEnum
ALTER TYPE "LayCategory" ADD VALUE 'POSTA';

-- Conto fisso Posta
INSERT INTO "Customer" ("id", "name", "surname", "notes", "active", "currentPeriod", "systemKey", "createdAt", "updatedAt")
VALUES (
  'posta-conto-fisso', 'Posta', '',
  'Conto fisso collegato alla cassa LAY: Avere = deposito di Posta, Dare = prelievo.',
  true, 1, 'POSTA', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);
