import { prisma } from "@/lib/prisma";
import { csvResponse } from "@/lib/export";
import { formatDateIT } from "@/lib/timezone";

export async function GET() {
  const rows_data = await prisma.withdrawal.findMany({
    where: { deletedAt: null },
    orderBy: { date: "desc" },
  });

  const rows = rows_data.map((w) => [
    formatDateIT(w.date),
    Number(w.amount).toFixed(2).replace(".", ","),
    w.source,
    w.destination ?? "",
    `${w.month}/${w.year}`,
    w.description ?? "",
  ]);

  return csvResponse("prelievi.csv", ["Data", "Importo", "Provenienza", "Destinazione", "Periodo", "Descrizione"], rows);
}
