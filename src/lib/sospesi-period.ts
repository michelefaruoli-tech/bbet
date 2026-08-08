import { prisma } from "@/lib/prisma";
import {
  calcCustomerBalance,
  isSuspendedBalanceZero,
  type SuspendedTotals,
} from "@/lib/calculations";

type MovementLike = {
  period: number;
  movementType: string;
  amount: unknown;
  date: Date;
  time?: string | null;
  createdAt?: Date;
};

/**
 * Totali del solo periodo aperto.
 * Se il periodo aperto ha già saldo 0 (ciclo chiuso non ancora archiviato),
 * restituisce contatori a zero come se fosse già partito il periodo nuovo.
 */
export function openSuspendedTotals(
  currentPeriod: number,
  movements: MovementLike[],
): SuspendedTotals & { openMovements: MovementLike[] } {
  const openMovements = movements.filter((m) => m.period === currentPeriod);
  const totals = calcCustomerBalance(openMovements);

  // Regola UI: a saldo 0 i contatori devono risultare azzerati
  if (isSuspendedBalanceZero(totals.balance)) {
    return {
      totalDare: 0,
      totalAvere: 0,
      balance: 0,
      movementCount: 0,
      openMovements: [],
    };
  }

  return { ...totals, openMovements };
}

/** Chiude i periodi aperti che sono già a saldo 0 (es. dati storici). */
export async function healClosedSuspendedPeriods() {
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    include: { movements: { where: { deletedAt: null } } },
  });

  for (const c of customers) {
    const open = c.movements.filter((m) => m.period === c.currentPeriod);
    if (open.length === 0) continue;
    const totals = calcCustomerBalance(open);
    if (!isSuspendedBalanceZero(totals.balance)) continue;
    await prisma.customer.update({
      where: { id: c.id },
      data: { currentPeriod: c.currentPeriod + 1 },
    });
  }
}
