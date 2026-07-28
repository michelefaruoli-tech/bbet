/**
 * Imposta il saldo cassa LAY a inizio luglio 2026 = -803 €
 * (aggiorna il cumulativo della chiusura di giugno 2026).
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const june = await prisma.layMonthlyClosure.findFirst({
    where: { year: 2026, month: 6 },
  });

  if (!june) {
    throw new Error("Chiusura giugno 2026 non trovata. Importa prima lo storico LAY.");
  }

  const updated = await prisma.layMonthlyClosure.update({
    where: { id: june.id },
    data: {
      cumulativeBalance: -803,
      notes:
        (june.notes ? june.notes + " | " : "") +
        "Saldo cassa a inizio luglio 2026 impostato a -803 € (confermato utente).",
    },
  });

  console.log("Aggiornato giugno 2026:");
  console.log("  Saldo mese (risultato):", Number(updated.monthlyBalance));
  console.log("  Saldo cassa cumulativo (inizio luglio):", Number(updated.cumulativeBalance));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
