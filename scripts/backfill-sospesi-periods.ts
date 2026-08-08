/**
 * Assegna i periodi storici ai movimenti sospesi:
 * ogni volta che Inviati − Ricevuti torna a 0, il periodo si chiude
 * e il successivo riparte da zero.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { assignSuspendedPeriods } from "../src/lib/calculations";

async function main() {
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    include: {
      movements: {
        where: { deletedAt: null },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  let updatedMovements = 0;
  let updatedCustomers = 0;

  for (const customer of customers) {
    if (customer.movements.length === 0) {
      if (customer.currentPeriod !== 1) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { currentPeriod: 1 },
        });
        updatedCustomers += 1;
      }
      continue;
    }

    const { assignments, currentPeriod } = assignSuspendedPeriods(customer.movements);

    for (const a of assignments) {
      const current = customer.movements.find((m) => m.id === a.id);
      if (!current || current.period === a.period) continue;
      await prisma.suspendedMovement.update({
        where: { id: a.id },
        data: { period: a.period },
      });
      updatedMovements += 1;
    }

    if (customer.currentPeriod !== currentPeriod) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { currentPeriod },
      });
      updatedCustomers += 1;
    }

    console.log(
      `${customer.surname} ${customer.name}: periodi fino a ${currentPeriod}, ${customer.movements.length} mov.`,
    );
  }

  console.log(`\nFatto. Movimenti aggiornati: ${updatedMovements}. Clienti aggiornati: ${updatedCustomers}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
