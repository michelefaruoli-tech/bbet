import { getFullDashboard } from "@/lib/calculations-server";
import { csvResponse } from "@/lib/export";

export async function GET() {
  const data = await getFullDashboard();
  const s = data.statement;

  const rows = [[
    s.online.toFixed(2).replace(".", ","),
    s.manualCreditAdjustment.toFixed(2).replace(".", ","),
    s.personalAccounts.toFixed(2).replace(".", ","),
    s.cash.toFixed(2).replace(".", ","),
    s.coins.toFixed(2).replace(".", ","),
    s.suspendedCredit.toFixed(2).replace(".", ","),
    s.tris.toFixed(2).replace(".", ","),
    s.master.toFixed(2).replace(".", ","),
    s.lay.toFixed(2).replace(".", ","),
    s.calculatedTotal.toFixed(2).replace(".", ","),
    s.cashTotal.toFixed(2).replace(".", ","),
    s.difference.toFixed(2).replace(".", ","),
  ]];

  return csvResponse(
    "rendiconto.csv",
    [
      "Online",
      "Credito±",
      "Conti personali",
      "Contanti",
      "Monete",
      "Credito",
      "Tris",
      "Master",
      "LAY (cassa separata, escluso dal totale)",
      "Totale calc.",
      "In cassa",
      "Differenza",
    ],
    rows,
  );
}
