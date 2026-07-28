import { toNumber } from "./format";

export type SuspendedTotals = {
  totalDare: number;
  totalAvere: number;
  balance: number;
  movementCount: number;
};

export function calcCustomerBalance(
  movements: Array<{ movementType: string; amount: unknown }>,
): SuspendedTotals {
  let totalDare = 0;
  let totalAvere = 0;
  for (const m of movements) {
    const amount = toNumber(m.amount);
    if (m.movementType === "DARE") totalDare += amount;
    else totalAvere += amount;
  }
  return {
    totalDare,
    totalAvere,
    balance: totalDare - totalAvere,
    movementCount: movements.length,
  };
}

export function calcCasinoNet(casinoGross: number): number {
  return casinoGross * 0.4;
}

export function calcCommissionPartial(invoice: number, bonus: number): number {
  return invoice + bonus;
}

export function calcCommissionFinal(
  invoice: number,
  bonus: number,
  cashFund: number,
  withdrawals: number,
): number {
  return roundMoney(invoice + bonus + cashFund - withdrawals);
}

export function calcCommissionCashBalance(input: {
  invoiceTotal: number;
  bonusTotal: number;
  cashFundTotal: number;
  withdrawalsTotal: number;
}): number {
  return roundMoney(
    input.invoiceTotal + input.bonusTotal + input.cashFundTotal - input.withdrawalsTotal,
  );
}

function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function calcCommissionIndicators(casinoNet: number, sportNet: number): number {
  return casinoNet + sportNet;
}

export function calcMasterBalance(movements: Array<{ amount: unknown }>): number {
  return movements.reduce((sum, m) => sum + toNumber(m.amount), 0);
}

export function calcLayBalance(movements: Array<{ amount: unknown }>): number {
  return movements.reduce((sum, m) => sum + toNumber(m.amount), 0);
}

export function detectTrisCategory(notes?: string | null): "TRIS" | null {
  if (!notes) return null;
  return /\btris\b/i.test(notes) ? "TRIS" : null;
}

export function calcTrisFromMovements(
  movements: Array<{ amount: unknown; category: string }>,
): { positive: number; negative: number; balance: number; count: number } {
  let positive = 0;
  let negative = 0;
  let count = 0;
  for (const m of movements) {
    if (m.category !== "TRIS") continue;
    const amount = toNumber(m.amount);
    count++;
    if (amount >= 0) positive += amount;
    else negative += Math.abs(amount);
  }
  return { positive, negative, balance: positive - negative, count };
}

export type FinancialStatementValues = {
  online: number;
  manualCreditAdjustment: number;
  personalAccounts: number;
  cash: number;
  coins: number;
  suspendedCredit: number;
  tris: number;
  master: number;
  lay: number;
  /** Somma campi manuali: Online + Credito± + Conti personali + Contanti + Monete */
  manualSum: number;
  /** Somma dei 4 automatici come entrano nel totale */
  automaticSum: number;
  calculatedTotal: number;
  cashTotal: number;
  suggestedCashTotal: number;
  difference: number;
};

export function buildFinancialStatement(input: {
  online: number;
  manualCreditAdjustment: number;
  personalAccounts: number;
  cash: number;
  coins: number;
  cashTotal: number;
  cashFund: number;
  suspendedCredit: number;
  tris: number;
  masterBalance: number;
  layBalance: number;
}): FinancialStatementValues {
  // Master: entra così com’è
  // Positivo = Master deve a noi · Negativo = noi dobbiamo a loro
  const master = input.masterBalance;
  const lay = input.layBalance;
  // Tris: se positivo (debito) entra col segno contrario (es. +2085 → −2085)
  const trisInTotal = input.tris * -1;
  const suggestedCashTotal = input.cash + input.coins;

  const round2 = (n: number) => Math.round(n * 100) / 100;

  // Blocco 1 — campi manuali
  const manualSum = round2(
    input.online +
      input.manualCreditAdjustment +
      input.personalAccounts +
      input.cash +
      input.coins,
  );

  // Blocco 2 — 4 automatici (come entrano nel totale)
  // Sospesi: entrano così come sono (positivo resta positivo)
  const suspendedInTotal = input.suspendedCredit;
  const layInTotal = -lay;
  const automaticSum = round2(suspendedInTotal + master + layInTotal + trisInTotal);

  // Totale Rendiconto = somma manuali + somma automatici
  const total = round2(manualSum + automaticSum);

  // Differenza = Fondo cassa − Rendiconto
  // > 0 mancano soldi (non ok) · < 0 soldi in più (ok) · = 0 allineato
  const difference = round2(input.cashFund - total);

  return {
    online: input.online,
    manualCreditAdjustment: input.manualCreditAdjustment,
    personalAccounts: input.personalAccounts,
    cash: input.cash,
    coins: input.coins,
    suspendedCredit: input.suspendedCredit,
    tris: input.tris,
    master,
    lay,
    manualSum,
    automaticSum,
    calculatedTotal: total,
    cashTotal: input.cashTotal,
    suggestedCashTotal,
    difference,
  };
}

export function quadratureMessage(difference: number): string {
  if (difference === 0) {
    return "Quadratura corretta: Fondo cassa e Rendiconto sono allineati.";
  }
  if (difference > 0) {
    return `Mancano soldi: il Fondo cassa supera il Rendiconto di ${difference.toFixed(2)} €.`;
  }
  return `Soldi in più: il Rendiconto supera il Fondo cassa di ${Math.abs(difference).toFixed(2)} €.`;
}
