import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const m = await prisma.commissionMonth.findFirst({
    where: { year: 2024, month: 6 },
  });
  if (!m) throw new Error("Giugno 2024 non trovato");

  await prisma.commissionMonth.update({
    where: { id: m.id },
    data: {
      notes:
        "Import Excel BBET 2024. Prelievi annuali 12.000 € e Totale In C. (fondo cassa) 6.217,30 € su giugno. Extra FC 4.400 €: solo informativo — già compreso nel Totale In C. 6.217,30 (non sommare di nuovo).",
      cashFund: 6217.3,
    },
  });

  console.log("OK: Extra FC resta informativo, fondo cassa = 6217.30");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
