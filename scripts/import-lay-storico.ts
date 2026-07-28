/**
 * Import storico LAY da foglio Excel (immagine giugno 2026).
 * Ogni riga mensile diventa una chiusura mensile LayMonthlyClosure.
 * "prima" 2019 = saldo precedente a ottobre → salvato come settembre 2019.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

type MonthRow = { year: number; month: number; balance: number; notes?: string };

const ROWS: MonthRow[] = [
  // 2019
  { year: 2019, month: 9, balance: 4294, notes: "Import storico: 'prima' (periodo precedente a ott-19)" },
  { year: 2019, month: 10, balance: 3956 },
  { year: 2019, month: 11, balance: 1277 },
  { year: 2019, month: 12, balance: 4588 },
  // 2020
  { year: 2020, month: 1, balance: 210 },
  { year: 2020, month: 2, balance: 205 },
  { year: 2020, month: 3, balance: 0 },
  { year: 2020, month: 4, balance: 0 },
  { year: 2020, month: 5, balance: 0 },
  { year: 2020, month: 6, balance: 630 },
  { year: 2020, month: 7, balance: 560 },
  { year: 2020, month: 8, balance: 550 },
  { year: 2020, month: 9, balance: 155 },
  { year: 2020, month: 10, balance: 793 },
  { year: 2020, month: 11, balance: 1818 },
  { year: 2020, month: 12, balance: 2749 },
  // 2021
  { year: 2021, month: 1, balance: 4217 },
  { year: 2021, month: 2, balance: 3211 },
  { year: 2021, month: 3, balance: 4517 },
  { year: 2021, month: 4, balance: 2030 },
  { year: 2021, month: 5, balance: 2719 },
  { year: 2021, month: 6, balance: 1693 },
  { year: 2021, month: 7, balance: 1560 },
  { year: 2021, month: 8, balance: 590 },
  { year: 2021, month: 9, balance: 1613 },
  { year: 2021, month: 10, balance: 2099 },
  { year: 2021, month: 11, balance: 3367 },
  { year: 2021, month: 12, balance: 1146 },
  // 2022
  { year: 2022, month: 1, balance: 2541 },
  { year: 2022, month: 2, balance: 1518 },
  { year: 2022, month: 3, balance: -1324 },
  { year: 2022, month: 4, balance: 1668 },
  { year: 2022, month: 5, balance: 1943 },
  { year: 2022, month: 6, balance: 940 },
  { year: 2022, month: 7, balance: 574 },
  { year: 2022, month: 8, balance: 1268 },
  { year: 2022, month: 9, balance: 1225 },
  { year: 2022, month: 10, balance: 1318 },
  { year: 2022, month: 11, balance: 1320 },
  { year: 2022, month: 12, balance: 887 },
  // 2023
  { year: 2023, month: 1, balance: -243 },
  { year: 2023, month: 2, balance: 1223 },
  { year: 2023, month: 3, balance: 1476 },
  { year: 2023, month: 4, balance: 1467 },
  { year: 2023, month: 5, balance: 1481 },
  { year: 2023, month: 6, balance: 1068 },
  { year: 2023, month: 7, balance: 534 },
  { year: 2023, month: 8, balance: 1435 },
  { year: 2023, month: 9, balance: 1718 },
  { year: 2023, month: 10, balance: 1122 },
  { year: 2023, month: 11, balance: 1524 },
  { year: 2023, month: 12, balance: 1676 },
  // 2024
  { year: 2024, month: 1, balance: 248 },
  { year: 2024, month: 2, balance: 3250 },
  { year: 2024, month: 3, balance: 2712 },
  { year: 2024, month: 4, balance: 1052 },
  { year: 2024, month: 5, balance: 1665 },
  { year: 2024, month: 6, balance: 1875 },
  { year: 2024, month: 7, balance: 1247 },
  { year: 2024, month: 8, balance: 1717 },
  { year: 2024, month: 9, balance: 781 },
  { year: 2024, month: 10, balance: 3614 },
  { year: 2024, month: 11, balance: 2003.5 },
  { year: 2024, month: 12, balance: 3190 },
  // 2025
  { year: 2025, month: 1, balance: 2176 },
  { year: 2025, month: 2, balance: 573 },
  { year: 2025, month: 3, balance: 727 },
  { year: 2025, month: 4, balance: 1469.5 },
  { year: 2025, month: 5, balance: 83 },
  { year: 2025, month: 6, balance: 81 },
  { year: 2025, month: 7, balance: 252 },
  { year: 2025, month: 8, balance: 495 },
  { year: 2025, month: 9, balance: 717 },
  { year: 2025, month: 10, balance: 346 },
  { year: 2025, month: 11, balance: 435 },
  { year: 2025, month: 12, balance: -806 },
  // 2026 fino a giugno
  { year: 2026, month: 1, balance: 1076 },
  { year: 2026, month: 2, balance: 787.5 },
  { year: 2026, month: 3, balance: 512 },
  { year: 2026, month: 4, balance: 1529 },
  { year: 2026, month: 5, balance: 1662 },
  { year: 2026, month: 6, balance: -2777 },
];

async function main() {
  let cumulative = 0;
  let created = 0;
  let updated = 0;

  for (const row of ROWS) {
    const positiveTotal = row.balance > 0 ? row.balance : 0;
    const negativeTotal = row.balance < 0 ? Math.abs(row.balance) : 0;
    cumulative += row.balance;

    const existing = await prisma.layMonthlyClosure.findFirst({
      where: { year: row.year, month: row.month },
    });

    const data = {
      positiveTotal,
      negativeTotal,
      monthlyBalance: row.balance,
      trisPositive: 0,
      trisNegative: 0,
      trisBalance: 0,
      cumulativeBalance: cumulative,
      movementCount: 0,
      notes: row.notes ?? "Import storico da foglio LAY",
      closedAt: new Date(row.year, row.month, 0, 23, 59, 59),
    };

    if (existing) {
      await prisma.layMonthlyClosure.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.layMonthlyClosure.create({
        data: { year: row.year, month: row.month, ...data },
      });
      created++;
    }
  }

  const expected = 111598.5;
  console.log(`Import LAY completato: ${created} creati, ${updated} aggiornati`);
  console.log(`Saldo cumulativo: ${cumulative}`);
  console.log(`Atteso dal foglio: ${expected}`);
  console.log(`Match: ${Math.abs(cumulative - expected) < 0.01 ? "SI" : "NO — verificare dati"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
