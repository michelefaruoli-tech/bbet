/**
 * Import Commissioni BBET 2024 da foglio Excel (immagine).
 *
 * Mapping colonne:
 * - fatt → invoiceAmount
 * - BONUS → bonusAmount
 * - Lordo Casino → casinoGross (Casino netto = 40% automatico)
 * - Netto Sport → sportNet
 *
 * Righe annuali:
 * - prelievi -12.000 → withdrawals su giugno
 * - Extra FC / Fondo cassa 4.400 → cashFund su giugno (versamento fondo)
 * - Saldo cassa reale = Fatt + Bonus + Fondo − Prelievi = 6.217,30
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  calcCasinoNet,
  calcCommissionFinal,
  calcCommissionPartial,
} from "../src/lib/calculations";

type MonthData = {
  month: number;
  invoice: number;
  bonus: number;
  casinoGross: number;
  sportNet: number;
  withdrawals?: number;
  cashFund?: number;
  notes?: string;
};

const YEAR = 2024;

const MONTHS: MonthData[] = [
  { month: 1, invoice: 885.36, bonus: 48, casinoGross: 120, sportNet: 3465.75 },
  { month: 2, invoice: 1062.72, bonus: 808, casinoGross: 2683, sportNet: 2941 },
  { month: 3, invoice: 1657, bonus: 3041, casinoGross: 10087, sportNet: 2617 },
  { month: 4, invoice: 1104, bonus: 2410, casinoGross: 7977, sportNet: -601 },
  { month: 5, invoice: 535.12, bonus: 754, casinoGross: 2495, sportNet: 1257.73 },
  {
    month: 6,
    invoice: 552.1,
    bonus: 960,
    casinoGross: 3063,
    sportNet: 1045,
    // Valori annuali dal foglio (righe prelievi / Totale In C.)
    withdrawals: 12000,
    cashFund: 4400,
    notes:
      "Extra FC / Fondo cassa 4.400 € + Prelievi 12.000 €. Saldo cassa anno = Fatt+Bonus+Fondo−Prelievi = 6.217,30.",
  },
];

async function ensureMonth(year: number, month: number) {
  const existing = await prisma.commissionMonth.findFirst({ where: { year, month } });
  if (existing) return existing;
  return prisma.commissionMonth.create({ data: { year, month } });
}

async function main() {
  let invoiceSum = 0;
  let bonusSum = 0;

  for (const row of MONTHS) {
    const casinoNet = calcCasinoNet(row.casinoGross);
    const withdrawals = row.withdrawals ?? 0;
    const cashFund = row.cashFund ?? 0;
    const partialTotal = calcCommissionPartial(row.invoice, row.bonus);
    const finalTotal = calcCommissionFinal(row.invoice, row.bonus, cashFund, withdrawals);

    invoiceSum += row.invoice;
    bonusSum += row.bonus;

    const monthRow = await ensureMonth(YEAR, row.month);
    await prisma.commissionMonth.update({
      where: { id: monthRow.id },
      data: {
        invoiceAmount: row.invoice,
        bonusAmount: row.bonus,
        casinoGross: row.casinoGross,
        casinoNet,
        sportNet: row.sportNet,
        withdrawals,
        cashFund,
        partialTotal,
        finalTotal,
        notes: row.notes ?? "Import Excel BBET 2024",
      },
    });

    console.log(
      `  ${YEAR}-${String(row.month).padStart(2, "0")}: fatt=${row.invoice} bonus=${row.bonus} casinoNet=${casinoNet}`,
    );
  }

  // Mesi vuoti luglio–dicembre
  for (let month = 7; month <= 12; month++) {
    await ensureMonth(YEAR, month);
  }

  const expectedInvoice = 5796.3;
  const expectedBonus = 8021;
  console.log("\nImport Commissioni 2024 completato.");
  console.log(`Totale fatture: ${invoiceSum} (atteso ${expectedInvoice}) → ${Math.abs(invoiceSum - expectedInvoice) < 0.02 ? "OK" : "DIFF"}`);
  console.log(`Totale bonus: ${bonusSum} (atteso ${expectedBonus}) → ${Math.abs(bonusSum - expectedBonus) < 0.02 ? "OK" : "DIFF"}`);
  console.log(`Totale parziale: ${invoiceSum + bonusSum} (atteso 13817.3)`);
  console.log("Prelievi annuali 12000 e Fondo cassa Extra FC 4400 su giugno 2024.");
  console.log("Saldo cassa reale atteso: 5796.3 + 8021 + 4400 - 12000 = 6217.3");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
