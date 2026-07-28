/**
 * Imposta il saldo Tris attuale a 2085 €
 * (= quanto si deve a loro a inizio mese aperto + movimenti già aperti).
 *
 * Regola:
 * - Positivo / Dare  → aumenta il debito (quanto devi)
 * - Negativo / Avere → scala il debito, fino a diventare negativo
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { toNumber } from "../src/lib/format";
import { calcTrisFromMovements } from "../src/lib/calculations";

const TARGET_TRIS = 2085;

async function main() {
  const june = await prisma.layMonthlyClosure.findFirst({
    where: { year: 2026, month: 6 },
  });
  if (!june) throw new Error("Chiusura giugno 2026 non trovata");

  const closures = await prisma.layMonthlyClosure.findMany({
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });
  const closedKeys = new Set(closures.map((c) => `${c.year}-${c.month}`));

  const openMovements = await prisma.layMovement.findMany({
    where: { deletedAt: null, category: "TRIS" },
  });
  const openTris = openMovements.filter((m) => {
    const d = new Date(m.date);
    return !closedKeys.has(`${d.getFullYear()}-${d.getMonth() + 1}`);
  });
  const openBalance = calcTrisFromMovements(openTris).balance;

  // Saldo chiusure precedenti a giugno (storico = 0 nell'import)
  const previousClosures = closures.filter(
    (c) => c.year < 2026 || (c.year === 2026 && c.month < 6),
  );
  const previousTris = previousClosures.reduce((s, c) => s + toNumber(c.trisBalance), 0);

  // Vogliamo: previous + giugno + open = 2085  →  giugno = 2085 - previous - open
  const juneTris = TARGET_TRIS - previousTris - openBalance;

  await prisma.layMonthlyClosure.update({
    where: { id: june.id },
    data: {
      trisPositive: Math.max(juneTris, 0),
      trisNegative: Math.max(-juneTris, 0),
      trisBalance: juneTris,
      notes:
        (june.notes ? june.notes + " | " : "") +
        `Saldo Tris impostato a ${TARGET_TRIS} € (debito verso di loro). Avere mensili scalano da qui.`,
    },
  });

  console.log("OK Tris impostato");
  console.log("  Target attuale:", TARGET_TRIS);
  console.log("  Movimenti aperti Tris:", openBalance);
  console.log("  Tris su chiusura giugno 2026:", juneTris);
  console.log("  Verifica:", previousTris + juneTris + openBalance, "(deve essere 2085)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
