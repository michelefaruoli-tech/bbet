import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const closures = await prisma.layMonthlyClosure.findMany({
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });
  let trisSum = 0;
  for (const c of closures) {
    const t = Number(c.trisBalance);
    if (t !== 0) console.log(`${c.year}-${c.month}: tris=${t}`);
    trisSum += t;
  }
  console.log("closures tris sum:", trisSum);

  const open = await prisma.layMovement.findMany({
    where: { deletedAt: null, category: "TRIS" },
    orderBy: { date: "asc" },
  });
  console.log("tris movements:", open.length);
  for (const m of open) {
    console.log(m.date.toISOString().slice(0, 10), Number(m.amount), m.notes);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
