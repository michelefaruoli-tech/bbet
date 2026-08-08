import { prisma } from "@/lib/prisma";
import { openSuspendedTotals } from "@/lib/sospesi-period";
import { csvResponse } from "@/lib/export";

export async function GET() {
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    include: { movements: { where: { deletedAt: null } } },
    orderBy: [{ surname: "asc" }, { name: "asc" }],
  });

  const rows = customers.map((c) => {
    const { openMovements: _o, ...t } = openSuspendedTotals(c.currentPeriod, c.movements);
    return [
      `${c.surname} ${c.name}`,
      t.totalDare.toFixed(2).replace(".", ","),
      t.totalAvere.toFixed(2).replace(".", ","),
      t.balance.toFixed(2).replace(".", ","),
      String(t.movementCount),
      String(c.currentPeriod),
      c.active ? "Attivo" : "Archiviato",
    ];
  });

  return csvResponse(
    "sospesi.csv",
    ["Cliente", "Inviati", "Ricevuti", "Saldo", "Movimenti", "Periodo", "Stato"],
    rows,
  );
}
