import { prisma } from "@/lib/prisma";
import { csvResponse } from "@/lib/export";
import { formatDateIT } from "@/lib/timezone";

export async function GET() {
  const movements = await prisma.layMovement.findMany({
    where: { deletedAt: null },
    orderBy: { date: "desc" },
  });

  const rows = movements.map((m) => [
    formatDateIT(m.date),
    Number(m.amount).toFixed(2).replace(".", ","),
    m.category,
    m.description ?? "",
    m.notes ?? "",
  ]);

  return csvResponse("lay.csv", ["Data", "Importo", "Categoria", "Descrizione", "Note"], rows);
}
