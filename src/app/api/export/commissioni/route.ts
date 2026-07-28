import { prisma } from "@/lib/prisma";
import { csvResponse } from "@/lib/export";

const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

export async function GET() {
  const months = await prisma.commissionMonth.findMany({ orderBy: [{ year: "asc" }, { month: "asc" }] });
  const rows = months.map((m) => [
    String(m.year),
    MONTHS[m.month - 1],
    Number(m.invoiceAmount).toFixed(2).replace(".", ","),
    Number(m.bonusAmount).toFixed(2).replace(".", ","),
    Number(m.casinoGross).toFixed(2).replace(".", ","),
    Number(m.casinoNet).toFixed(2).replace(".", ","),
    Number(m.sportNet).toFixed(2).replace(".", ","),
    Number(m.withdrawals).toFixed(2).replace(".", ","),
    Number(m.cashFund).toFixed(2).replace(".", ","),
    Number(m.finalTotal).toFixed(2).replace(".", ","),
  ]);

  return csvResponse(
    "commissioni.csv",
    ["Anno", "Mese", "Fattura", "Bonus", "Casino lordo", "Casino netto", "Netto Sport", "Prelievi", "Fondo cassa", "Totale finale"],
    rows,
  );
}
