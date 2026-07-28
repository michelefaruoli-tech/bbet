/**
 * Allinea Commissioni 2024 alla formula corretta:
 * Fatt + Bonus + Fondo cassa (Extra FC 4.400) − Prelievi 12.000 = Saldo cassa 6.217,30
 *
 * Prima cashFund su giugno era 6217.30 (il risultato).
 * Ora cashFund = 4400 (Extra FC / versamento fondo), il risultato è calcolato.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  calcCasinoNet,
  calcCommissionFinal,
  calcCommissionPartial,
} from "../src/lib/calculations";

async function main() {
  const months = await prisma.commissionMonth.findMany({
    where: { year: 2024 },
    orderBy: { month: "asc" },
  });

  for (const m of months) {
    const cashFund = m.month === 6 ? 4400 : Number(m.cashFund);
    const withdrawals = m.month === 6 ? 12000 : Number(m.withdrawals);
    const invoice = Number(m.invoiceAmount);
    const bonus = Number(m.bonusAmount);
    const casinoGross = Number(m.casinoGross);
    const partialTotal = calcCommissionPartial(invoice, bonus);
    const finalTotal = calcCommissionFinal(invoice, bonus, cashFund, withdrawals);
    const casinoNet = calcCasinoNet(casinoGross);

    await prisma.commissionMonth.update({
      where: { id: m.id },
      data: {
        cashFund,
        withdrawals,
        partialTotal,
        finalTotal,
        casinoNet,
        notes:
          m.month === 6
            ? "Fondo cassa Extra FC 4.400 € · Prelievi 12.000 €. Saldo cassa = Fatt+Bonus+Fondo−Prelievi (anno)."
            : m.notes,
      },
    });
  }

  const all = await prisma.commissionMonth.findMany({ where: { year: 2024 } });
  const fatt = all.reduce((s, m) => s + Number(m.invoiceAmount), 0);
  const bonus = all.reduce((s, m) => s + Number(m.bonusAmount), 0);
  const fondo = all.reduce((s, m) => s + Number(m.cashFund), 0);
  const prelievi = all.reduce((s, m) => s + Number(m.withdrawals), 0);
  const saldo = fatt + bonus + fondo - prelievi;

  console.log("Fatt:", fatt);
  console.log("Bonus:", bonus);
  console.log("Fondo cassa (Extra FC):", fondo);
  console.log("Prelievi:", prelievi);
  console.log("Saldo cassa reale:", saldo, "(atteso 6217.3)", Math.abs(saldo - 6217.3) < 0.02 ? "OK" : "DIFF");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
