import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { formatTimeIT } from "../src/lib/timezone";

/** Riempie l'ora mancante usando createdAt (fuso Roma). */
async function main() {
  const missing = await prisma.suspendedMovement.findMany({
    where: {
      deletedAt: null,
      OR: [{ time: null }, { time: "" }],
    },
    select: { id: true, createdAt: true },
  });

  let n = 0;
  for (const m of missing) {
    const time = formatTimeIT(m.createdAt);
    await prisma.suspendedMovement.update({
      where: { id: m.id },
      data: { time },
    });
    n += 1;
  }
  console.log(`Aggiornati ${n} movimenti con ora da createdAt.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
