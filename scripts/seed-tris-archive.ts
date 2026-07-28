/**
 * Crea/aggiorna l'archivio Tris di giugno 2026 con cumulativo tale
 * che saldo attuale = 2085 (debito verso di loro).
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { calcTrisFromMovements } from "../src/lib/calculations";

const TARGET = 2085;

async function main() {
  const closures = await prisma.trisMonthlyClosure.findMany({
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });
  const closedKeys = new Set(closures.map((c) => `${c.year}-${c.month}`));

  const openMovements = await prisma.layMovement.findMany({
    where: { deletedAt: null, category: "TRIS" },
  });
  const open = openMovements.filter((m) => {
    const d = new Date(m.date);
    return !closedKeys.has(`${d.getFullYear()}-${d.getMonth() + 1}`);
  });
  const openBalance = calcTrisFromMovements(open).balance;

  // Cumulativo a fine giugno = target - movimenti aperti (luglio+)
  const juneCumulative = TARGET - openBalance;

  await prisma.trisMonthlyClosure.upsert({
    where: { year_month: { year: 2026, month: 6 } },
    update: {
      // Avere = operazioni positive · Dare = operazioni negative
      avereTotal: Math.max(juneCumulative, 0),
      dareTotal: Math.max(-juneCumulative, 0),
      monthlyBalance: juneCumulative,
      cumulativeBalance: juneCumulative,
      movementCount: 0,
      notes:
        "Saldo Tris impostato a 2085 € (debito). Archivio mensile separato da LAY.",
      closedAt: new Date(),
    },
    create: {
      year: 2026,
      month: 6,
      // Avere = operazioni positive · Dare = operazioni negative
      avereTotal: Math.max(juneCumulative, 0),
      dareTotal: Math.max(-juneCumulative, 0),
      monthlyBalance: juneCumulative,
      cumulativeBalance: juneCumulative,
      movementCount: 0,
      notes:
        "Saldo Tris impostato a 2085 € (debito). Archivio mensile separato da LAY.",
    },
  });

  // Allinea anche il campo tris sulla chiusura LAY di giugno (informativo)
  const juneLay = await prisma.layMonthlyClosure.findFirst({
    where: { year: 2026, month: 6 },
  });
  if (juneLay) {
    await prisma.layMonthlyClosure.update({
      where: { id: juneLay.id },
      data: {
        trisPositive: Math.max(juneCumulative, 0),
        trisNegative: Math.max(-juneCumulative, 0),
        trisBalance: juneCumulative,
      },
    });
  }

  console.log("OK Archivio Tris giugno 2026");
  console.log("  Cumulativo giugno:", juneCumulative);
  console.log("  Movimenti aperti:", openBalance);
  console.log("  Saldo attuale atteso:", juneCumulative + openBalance);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
