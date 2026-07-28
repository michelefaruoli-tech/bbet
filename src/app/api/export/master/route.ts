import { prisma } from "@/lib/prisma";
import { csvResponse } from "@/lib/export";
import { formatDateIT } from "@/lib/timezone";

export async function GET() {
  const movements = await prisma.masterMovement.findMany({
    where: { deletedAt: null },
    orderBy: { date: "desc" },
  });

  const rows = movements.map((m) => [
    formatDateIT(m.date),
    m.movementType,
    Number(m.amount).toFixed(2).replace(".", ","),
    m.description ?? "",
  ]);

  return csvResponse("master.csv", ["Data", "Tipo", "Importo", "Descrizione"], rows);
}
