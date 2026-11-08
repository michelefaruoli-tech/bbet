/**
 * Stampa i numeri della quadratura (rendiconto) calcolati dall'app.
 * Serve a confrontare versione vecchia e nuova sullo stesso database:
 *   npx tsx scripts/quadratura-check.ts
 */
import "dotenv/config";
import { getFullDashboard } from "../src/lib/calculations-server";

async function main() {
  const d = await getFullDashboard();
  const s = d.statement;
  const out = {
    fondoCassa: d.cashFund,
    sospesiNetto: d.suspended.netTotal,
    trisNelTotale: s.tris,
    master: s.master,
    lay: s.lay,
    manuali: s.manualSum,
    automatici: s.automaticSum,
    totaleRendiconto: s.calculatedTotal,
    differenza: s.difference,
  };
  console.log(JSON.stringify(out, null, 2));
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
