"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "./prisma";
import { requireSession } from "./auth";
import { writeAuditLog } from "./audit";
import { parseItalianNumber } from "./format";
import { parseItalianDate, formatTimeIT } from "./timezone";
import { closeLayMonthCore, reopenLayMonthCore } from "./lay-closing";
import {
  calcCasinoNet,
  calcCommissionFinal,
  calcCommissionPartial,
  calcCustomerBalance,
  isSuspendedBalanceZero,
} from "./calculations";

/** Le pagine si ricaricano tutte: i numeri sono collegati (sospesi → rendiconto → home). */
function revalidateAll() {
  revalidatePath("/", "layout");
}

function todayDateUTC() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${parts}T00:00:00.000Z`);
}

const customerSchema = z.object({
  name: z.string().min(1),
  surname: z.string().min(1),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export async function saveCustomerAction(formData: FormData) {
  const session = await requireSession();
  const id = formData.get("id") as string | null;
  const data = customerSchema.parse({
    name: formData.get("name"),
    surname: formData.get("surname"),
    phone: formData.get("phone") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (id) {
    const old = await prisma.customer.findUnique({ where: { id } });
    const updated = await prisma.customer.update({ where: { id }, data });
    await writeAuditLog({
      userId: session.id,
      entityType: "Customer",
      entityId: id,
      action: "UPDATE",
      oldValue: old,
      newValue: updated,
    });
  } else {
    const created = await prisma.customer.create({ data });
    await writeAuditLog({
      userId: session.id,
      entityType: "Customer",
      entityId: created.id,
      action: "CREATE",
      newValue: created,
    });
  }

  revalidateAll();
  return { success: true };
}

export async function archiveCustomerAction(id: string, active: boolean) {
  const session = await requireSession();
  const current = await prisma.customer.findUnique({ where: { id } });
  if (current?.systemKey) return { error: "Il conto Tris è fisso e non si archivia" };
  const updated = await prisma.customer.update({ where: { id }, data: { active } });
  await writeAuditLog({
    userId: session.id,
    entityType: "Customer",
    entityId: id,
    action: active ? "RESTORE" : "ARCHIVE",
    newValue: updated,
  });
  revalidateAll();
  return { success: true };
}

export async function deleteCustomerAction(id: string) {
  const session = await requireSession();
  const current = await prisma.customer.findUnique({ where: { id } });
  if (current?.systemKey) return { error: "Il conto Tris è fisso e non si elimina" };
  const updated = await prisma.customer.update({
    where: { id },
    data: { deletedAt: new Date(), active: false },
  });
  await writeAuditLog({
    userId: session.id,
    entityType: "Customer",
    entityId: id,
    action: "SOFT_DELETE",
    newValue: updated,
  });
  revalidateAll();
  return { success: true };
}

export async function saveSuspendedMovementAction(formData: FormData) {
  const session = await requireSession();
  const id = formData.get("id") as string | null;
  const customerId = String(formData.get("customerId"));
  const dateStr = String(formData.get("date"));
  const date = parseItalianDate(dateStr) ?? new Date(dateStr);

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer || customer.deletedAt) return { error: "Cliente non trovato" };
  if (customer.systemKey === "POSTA") return savePostaMovementAction(formData);

  const payload = {
    customerId,
    date,
    time: (formData.get("time") as string)?.trim() || formatTimeIT(),
    movementType: formData.get("movementType") as "DARE" | "AVERE",
    amount: parseItalianNumber(String(formData.get("amount"))),
    description: (formData.get("description") as string) || null,
    notes: (formData.get("notes") as string) || null,
    period: customer.currentPeriod,
  };

  if (id) {
    const old = await prisma.suspendedMovement.findUnique({ where: { id } });
    const updated = await prisma.suspendedMovement.update({
      where: { id },
      data: {
        date: payload.date,
        time: payload.time,
        movementType: payload.movementType,
        amount: payload.amount,
        description: payload.description,
        notes: payload.notes,
      },
    });
    await writeAuditLog({
      userId: session.id,
      entityType: "SuspendedMovement",
      entityId: id,
      action: "UPDATE",
      oldValue: old,
      newValue: updated,
    });
  } else {
    const created = await prisma.suspendedMovement.create({
      data: { ...payload, createdById: session.id },
    });
    await writeAuditLog({
      userId: session.id,
      entityType: "SuspendedMovement",
      entityId: created.id,
      action: "CREATE",
      newValue: created,
    });
  }

  await maybeCloseSuspendedPeriod(customerId, session.id);

  revalidateAll();
  return { success: true };
}

/** Se il saldo del periodo aperto è 0, archivia e apre un periodo nuovo (contatori a zero). */
async function maybeCloseSuspendedPeriod(customerId: string, userId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer || customer.systemKey) return; // il conto Tris non ha periodi

  const openMovements = await prisma.suspendedMovement.findMany({
    where: { customerId, deletedAt: null, period: customer.currentPeriod },
  });
  if (openMovements.length === 0) return;

  const totals = calcCustomerBalance(openMovements);
  if (!isSuspendedBalanceZero(totals.balance)) return;

  const nextPeriod = customer.currentPeriod + 1;
  await prisma.customer.update({
    where: { id: customerId },
    data: { currentPeriod: nextPeriod },
  });

  await writeAuditLog({
    userId,
    entityType: "Customer",
    entityId: customerId,
    action: "CLOSE_SOSPESI_PERIOD",
    newValue: {
      closedPeriod: customer.currentPeriod,
      nextPeriod,
      totalDare: totals.totalDare,
      totalAvere: totals.totalAvere,
    },
  });
}

export async function deleteSuspendedMovementAction(id: string, customerId: string) {
  const session = await requireSession();
  const updated = await prisma.suspendedMovement.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await writeAuditLog({
    userId: session.id,
    entityType: "SuspendedMovement",
    entityId: id,
    action: "SOFT_DELETE",
    newValue: updated,
  });

  await maybeCloseSuspendedPeriod(customerId, session.id);

  revalidateAll();
  return { success: true };
}

export async function saveMasterMovementAction(formData: FormData) {
  const session = await requireSession();
  const id = formData.get("id") as string | null;
  const rawAmount = Math.abs(parseItalianNumber(String(formData.get("amount"))));
  const dateStr = String(formData.get("date"));
  const date = parseItalianDate(dateStr) ?? new Date(dateStr);
  const movementType = formData.get("movementType") as
    | "RICARICA"
    | "PAGAMENTO"
    | "BONUS"
    | "RETTIFICA"
    | "ALTRO";

  // Dare (−) / Avere (+):
  // Avere = positivo = Master deve a noi
  // Dare = negativo = noi dobbiamo a loro
  let sign = formData.get("sign") === "negative" ? -1 : 1;
  if (movementType === "RICARICA" || movementType === "BONUS") sign = -1; // Dare
  if (movementType === "PAGAMENTO") sign = 1; // Avere

  const payload = {
    date,
    time: (formData.get("time") as string) || null,
    movementType,
    amount: rawAmount * sign,
    description: (formData.get("description") as string) || null,
    notes: (formData.get("notes") as string) || null,
  };

  if (id) {
    const old = await prisma.masterMovement.findUnique({ where: { id } });
    const updated = await prisma.masterMovement.update({ where: { id }, data: payload });
    await writeAuditLog({
      userId: session.id,
      entityType: "MasterMovement",
      entityId: id,
      action: "UPDATE",
      oldValue: old,
      newValue: updated,
    });
  } else {
    const created = await prisma.masterMovement.create({
      data: { ...payload, createdById: session.id },
    });
    await writeAuditLog({
      userId: session.id,
      entityType: "MasterMovement",
      entityId: created.id,
      action: "CREATE",
      newValue: created,
    });
  }

  revalidateAll();
  return { success: true };
}

/** Aggiorna solo le note di un movimento Master già inserito. */
export async function updateMasterNotesAction(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") || "");
  if (!id) return { error: "Movimento non trovato" };

  const notesRaw = String(formData.get("notes") ?? "");
  const notes = notesRaw.trim() ? notesRaw.trim() : null;

  const old = await prisma.masterMovement.findUnique({ where: { id } });
  if (!old || old.deletedAt) return { error: "Movimento non trovato" };

  const updated = await prisma.masterMovement.update({
    where: { id },
    data: { notes },
  });

  await writeAuditLog({
    userId: session.id,
    entityType: "MasterMovement",
    entityId: id,
    action: "UPDATE",
    oldValue: { notes: old.notes },
    newValue: { notes: updated.notes },
  });

  revalidateAll();
  return { success: true };
}

export async function deleteMasterMovementAction(id: string) {
  const session = await requireSession();
  const updated = await prisma.masterMovement.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await writeAuditLog({
    userId: session.id,
    entityType: "MasterMovement",
    entityId: id,
    action: "SOFT_DELETE",
    newValue: updated,
  });
  revalidateAll();
  return { success: true };
}

export async function saveCommissionMonthAction(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id"));
  const invoiceAmount = parseItalianNumber(String(formData.get("invoiceAmount")));
  const bonusAmount = parseItalianNumber(String(formData.get("bonusAmount")));
  const casinoGross = parseItalianNumber(String(formData.get("casinoGross")));
  const sportNet = parseItalianNumber(String(formData.get("sportNet")));
  const withdrawals = parseItalianNumber(String(formData.get("withdrawals")));
  const cashFund = parseItalianNumber(String(formData.get("cashFund")));
  const casinoNet = calcCasinoNet(casinoGross);
  const partialTotal = calcCommissionPartial(invoiceAmount, bonusAmount);
  const finalTotal = calcCommissionFinal(invoiceAmount, bonusAmount, cashFund, withdrawals);

  const old = await prisma.commissionMonth.findUnique({ where: { id } });
  const updated = await prisma.commissionMonth.update({
    where: { id },
    data: {
      invoiceAmount,
      bonusAmount,
      casinoGross,
      casinoNet,
      sportNet,
      withdrawals,
      cashFund,
      partialTotal,
      finalTotal,
      notes: (formData.get("notes") as string) || null,
    },
  });

  await writeAuditLog({
    userId: session.id,
    entityType: "CommissionMonth",
    entityId: id,
    action: "UPDATE",
    oldValue: old,
    newValue: updated,
  });

  revalidateAll();
  return { success: true };
}

export async function saveLayMovementAction(formData: FormData) {
  const session = await requireSession();
  const id = formData.get("id") as string | null;
  const rawAmount = parseItalianNumber(String(formData.get("amount")));
  const sign = formData.get("sign") === "negative" ? -1 : 1;
  const notes = (formData.get("notes") as string) || null;
  // Il Tris non passa più dal LAY: i movimenti nuovi sono sempre LAY normali.
  // In modifica si conserva la categoria (i vecchi movimenti Tris restano nello storico).
  const existingCategory = id
    ? (await prisma.layMovement.findUnique({ where: { id }, select: { category: true } }))?.category
    : null;
  const category = existingCategory ?? "GENERICO";

  const dateStr = String(formData.get("date"));
  const date = parseItalianDate(dateStr) ?? new Date(dateStr);

  const payload = {
    date,
    time: (formData.get("time") as string) || null,
    amount: rawAmount * sign,
    category,
    description: (formData.get("description") as string) || null,
    notes,
  };

  if (id) {
    const old = await prisma.layMovement.findUnique({ where: { id } });
    const updated = await prisma.layMovement.update({ where: { id }, data: payload });
    await writeAuditLog({
      userId: session.id,
      entityType: "LayMovement",
      entityId: id,
      action: "UPDATE",
      oldValue: old,
      newValue: updated,
    });
  } else {
    const created = await prisma.layMovement.create({
      data: { ...payload, createdById: session.id },
    });
    await writeAuditLog({
      userId: session.id,
      entityType: "LayMovement",
      entityId: created.id,
      action: "CREATE",
      newValue: created,
    });
  }

  revalidateAll();
  return { success: true };
}

export async function deleteLayMovementAction(id: string) {
  const session = await requireSession();
  const updated = await prisma.layMovement.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await writeAuditLog({
    userId: session.id,
    entityType: "LayMovement",
    entityId: id,
    action: "SOFT_DELETE",
    newValue: updated,
  });
  revalidateAll();
  return { success: true };
}

export async function closeLayMonthAction(year: number, month: number) {
  const session = await requireSession();
  const result = await closeLayMonthCore(year, month, session.id);
  revalidateAll();
  return { success: true, ...result };
}

/** Riapre il mese LAY (e l'archivio Tris di quel mese). Resta aperto finché non lo richiudi a mano. */
export async function reopenLayMonthAction(year: number, month: number) {
  const session = await requireSession();
  const result = await reopenLayMonthCore(year, month, session.id);
  revalidateAll();
  return result;
}

// ---------- Conto Posta (cassa LAY) ----------

/**
 * Deposito o prelievo di Posta sulla cassa LAY.
 * Avere = deposito (Posta mette soldi, LAY +) · Dare = prelievo (dai soldi a Posta, LAY −).
 * Si salva come movimento LAY con categoria POSTA.
 */
export async function savePostaMovementAction(formData: FormData) {
  const session = await requireSession();
  const movementType = formData.get("movementType") === "AVERE" ? "AVERE" : "DARE";
  const amount = Math.abs(parseItalianNumber(String(formData.get("amount") ?? "")));
  if (!amount) return { error: "Inserisci un importo" };
  const dateStr = String(formData.get("date") ?? "");
  const date = parseItalianDate(dateStr) ?? (dateStr ? new Date(dateStr) : todayDateUTC());
  const extra = [formData.get("description"), formData.get("notes")]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .join(" · ");

  const created = await prisma.layMovement.create({
    data: {
      date,
      time: (formData.get("time") as string)?.trim() || formatTimeIT(),
      amount: movementType === "AVERE" ? amount : -amount,
      category: "POSTA",
      description: movementType === "AVERE" ? "Deposito Posta" : "Prelievo Posta",
      notes: extra || null,
      createdById: session.id,
    },
  });
  await writeAuditLog({
    userId: session.id,
    entityType: "LayMovement",
    entityId: created.id,
    action: "CREATE",
    newValue: { ...created, via: "contoPosta" },
  });
  revalidateAll();
  return { success: true };
}

// ---------- Giocate Tris ----------

export async function saveTrisPlayAction(formData: FormData) {
  const session = await requireSession();
  const id = (formData.get("id") as string | null) || null;
  const playType = formData.get("playType") === "AVERE" ? "AVERE" : "DARE";
  const amount = Math.abs(parseItalianNumber(String(formData.get("amount") ?? "")));
  if (!amount) return { error: "Inserisci un importo" };
  const dateStr = String(formData.get("date") ?? "");
  const date = parseItalianDate(dateStr) ?? (dateStr ? new Date(dateStr) : todayDateUTC());
  const payload = {
    date,
    time: (formData.get("time") as string)?.trim() || formatTimeIT(),
    playType: playType as "DARE" | "AVERE",
    amount,
    notes: ((formData.get("notes") as string) || "").trim() || null,
  };

  if (id) {
    const old = await prisma.trisPlay.findUnique({ where: { id } });
    if (!old || old.deletedAt) return { error: "Giocata non trovata" };
    const updated = await prisma.trisPlay.update({ where: { id }, data: payload });
    await writeAuditLog({
      userId: session.id,
      entityType: "TrisPlay",
      entityId: id,
      action: "UPDATE",
      oldValue: old,
      newValue: updated,
    });
  } else {
    const created = await prisma.trisPlay.create({ data: { ...payload, createdById: session.id } });
    await writeAuditLog({
      userId: session.id,
      entityType: "TrisPlay",
      entityId: created.id,
      action: "CREATE",
      newValue: created,
    });
  }
  revalidateAll();
  return { success: true };
}

export async function deleteTrisPlayAction(id: string) {
  const session = await requireSession();
  const updated = await prisma.trisPlay.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAuditLog({
    userId: session.id,
    entityType: "TrisPlay",
    entityId: id,
    action: "SOFT_DELETE",
    newValue: updated,
  });
  revalidateAll();
  return { success: true };
}

export async function saveWithdrawalAction(formData: FormData) {
  const session = await requireSession();
  const id = formData.get("id") as string | null;
  const dateStr = String(formData.get("date") || "");
  const date = parseItalianDate(dateStr) ?? new Date();
  const year = Number(formData.get("year")) || date.getFullYear();
  const month = Number(formData.get("month")) || date.getMonth() + 1;
  const sourceRaw = String(formData.get("source") || "COMMISSIONI");
  const source = sourceRaw === "LAY" ? "LAY" : "COMMISSIONI";
  const amount = Math.abs(parseItalianNumber(String(formData.get("amount"))));

  if (!amount) return { error: "Inserisci un importo" };

  const payload = {
    date,
    amount,
    source: source as "COMMISSIONI" | "LAY",
    destination: "Contanti",
    linkedSection: source,
    year,
    month,
    description:
      (formData.get("description") as string) ||
      (source === "COMMISSIONI"
        ? "Prelievo contanti da Commissioni"
        : "Prelievo contanti da LAY"),
    notes: (formData.get("notes") as string) || null,
  };

  if (id) {
    const old = await prisma.withdrawal.findUnique({ where: { id } });
    const updated = await prisma.withdrawal.update({ where: { id }, data: payload });
    await writeAuditLog({
      userId: session.id,
      entityType: "Withdrawal",
      entityId: id,
      action: "UPDATE",
      oldValue: old,
      newValue: updated,
    });
    if (old) await syncCommissionWithdrawals(old.year, old.month);
    await syncCommissionWithdrawals(year, month);
  } else {
    const created = await prisma.withdrawal.create({
      data: { ...payload, createdById: session.id },
    });

    if (source === "COMMISSIONI") {
      await syncCommissionWithdrawals(year, month);
    }

    if (source === "LAY") {
      // Uscita dalla cassa LAY: aggiorna il saldo LAY
      const layMov = await prisma.layMovement.create({
        data: {
          date,
          amount: -amount,
          category: "GENERICO",
          description: "Prelievo contanti",
          notes: payload.notes
            ? `Prelievo #${created.id} · ${payload.notes}`
            : `Prelievo #${created.id}`,
          createdById: session.id,
        },
      });
      await writeAuditLog({
        userId: session.id,
        entityType: "LayMovement",
        entityId: layMov.id,
        action: "CREATE",
        newValue: { ...layMov, linkedWithdrawalId: created.id },
      });
    }

    await writeAuditLog({
      userId: session.id,
      entityType: "Withdrawal",
      entityId: created.id,
      action: "CREATE",
      newValue: created,
    });
  }

  revalidateAll();
  return { success: true };
}

async function syncCommissionWithdrawals(year: number, month: number) {
  let commission = await prisma.commissionMonth.findFirst({ where: { year, month } });
  if (!commission) {
    commission = await prisma.commissionMonth.create({ data: { year, month } });
  }

  const totalWithdrawals = await prisma.withdrawal.aggregate({
    where: { year, month, deletedAt: null, source: "COMMISSIONI" },
    _sum: { amount: true },
  });
  const w = Number(totalWithdrawals._sum.amount ?? 0);
  const finalTotal = calcCommissionFinal(
    Number(commission.invoiceAmount),
    Number(commission.bonusAmount),
    Number(commission.cashFund),
    w,
  );
  await prisma.commissionMonth.update({
    where: { id: commission.id },
    data: { withdrawals: w, finalTotal },
  });
}

export async function deleteWithdrawalAction(id: string) {
  const session = await requireSession();
  const row = await prisma.withdrawal.findUnique({ where: { id } });
  if (!row) return { error: "Prelievo non trovato" };

  const updated = await prisma.withdrawal.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await writeAuditLog({
    userId: session.id,
    entityType: "Withdrawal",
    entityId: id,
    action: "SOFT_DELETE",
    newValue: updated,
  });

  if (row.source === "COMMISSIONI") {
    await syncCommissionWithdrawals(row.year, row.month);
  }

  if (row.source === "LAY") {
    // Soft-delete del movimento LAY collegato (cercato per nota con id prelievo)
    const linked = await prisma.layMovement.findMany({
      where: {
        deletedAt: null,
        notes: { contains: `Prelievo #${id}` },
      },
    });
    for (const mov of linked) {
      await prisma.layMovement.update({
        where: { id: mov.id },
        data: { deletedAt: new Date() },
      });
    }
  }

  revalidateAll();
  return { success: true };
}

export async function saveFinancialStatementAction(formData: FormData) {
  const session = await requireSession();
  const old = await prisma.financialStatementCurrent.findUnique({ where: { id: "current" } });

  const data = {
    online: parseItalianNumber(String(formData.get("online"))),
    manualCreditAdjustment: parseItalianNumber(String(formData.get("manualCreditAdjustment"))),
    personalAccounts: parseItalianNumber(String(formData.get("personalAccounts"))),
    cash: parseItalianNumber(String(formData.get("cash"))),
    coins: parseItalianNumber(String(formData.get("coins"))),
    cashTotal: parseItalianNumber(String(formData.get("cashTotal"))),
    notes: (formData.get("notes") as string) || null,
  };

  const updated = await prisma.financialStatementCurrent.upsert({
    where: { id: "current" },
    update: data,
    create: { id: "current", ...data },
  });

  await writeAuditLog({
    userId: session.id,
    entityType: "FinancialStatementCurrent",
    entityId: "current",
    action: "UPDATE",
    oldValue: old,
    newValue: updated,
  });

  revalidateAll();
  return { success: true };
}

export async function saveFinancialSnapshotAction(formData: FormData) {
  const session = await requireSession();
  const { getFullDashboard } = await import("./calculations-server");
  const dashboard = await getFullDashboard();
  const manual = dashboard.statement;

  const snapshot = await prisma.financialStatementSnapshot.create({
    data: {
      snapshotDate: new Date(),
      snapshotType: (formData.get("snapshotType") as string) || "MANUAL",
      online: manual.online,
      manualCreditAdjustment: manual.manualCreditAdjustment,
      personalAccounts: manual.personalAccounts,
      cash: manual.cash,
      coins: manual.coins,
      suspendedCredit: manual.suspendedCredit,
      tris: manual.tris,
      master: manual.master,
      lay: manual.lay,
      calculatedTotal: manual.calculatedTotal,
      cashTotal: manual.cashTotal,
      difference: manual.difference,
      notes: (formData.get("notes") as string) || null,
      createdById: session.id,
    },
  });

  await writeAuditLog({
    userId: session.id,
    entityType: "FinancialStatementSnapshot",
    entityId: snapshot.id,
    action: "CREATE",
    newValue: snapshot,
  });

  revalidateAll();
  return { success: true };
}

export async function closeYearAction(year: number) {
  const session = await requireSession();

  const { getSuspendedSummary, getMasterSummary, getLaySummary, getCashFundCurrent } =
    await import("./calculations-server");

  const [suspended, master, lay, cashFund] = await Promise.all([
    getSuspendedSummary(),
    getMasterSummary(),
    getLaySummary(),
    getCashFundCurrent(),
  ]);

  const commissions = await prisma.commissionMonth.findMany({ where: { year } });
  const commissionTotal = commissions.reduce((s, m) => s + Number(m.finalTotal), 0);
  const withdrawals = await prisma.withdrawal.aggregate({
    where: { year, deletedAt: null },
    _sum: { amount: true },
  });

  await prisma.annualArchive.upsert({
    where: { year },
    update: {
      openingCashFund: cashFund,
      closingCashFund: cashFund,
      suspendedBalance: suspended.netTotal,
      masterBalance: master.balance,
      layBalance: lay.cumulativeBalance,
      commissionTotal,
      withdrawalTotal: Number(withdrawals._sum.amount ?? 0),
      finalBalance: commissionTotal,
      closedAt: new Date(),
    },
    create: {
      year,
      openingCashFund: cashFund,
      closingCashFund: cashFund,
      suspendedBalance: suspended.netTotal,
      masterBalance: master.balance,
      layBalance: lay.cumulativeBalance,
      commissionTotal,
      withdrawalTotal: Number(withdrawals._sum.amount ?? 0),
      finalBalance: commissionTotal,
    },
  });

  await prisma.commissionMonth.updateMany({
    where: { year },
    data: { closed: true },
  });

  const nextYear = year + 1;
  for (let month = 1; month <= 12; month++) {
    await prisma.commissionMonth.upsert({
      where: { year_month: { year: nextYear, month } },
      update: {},
      create: {
        year: nextYear,
        month,
        cashFund: month === 1 ? cashFund : 0,
      },
    });
  }

  await writeAuditLog({
    userId: session.id,
    entityType: "AnnualArchive",
    action: "CLOSE_YEAR",
    newValue: { year },
  });

  revalidateAll();
  return { success: true };
}

export async function reopenYearAction(year: number) {
  const session = await requireSession();

  const existing = await prisma.annualArchive.findUnique({ where: { year } });
  if (!existing) return { error: `L'anno ${year} non risulta chiuso` };

  await prisma.annualArchive.delete({ where: { year } });

  await prisma.commissionMonth.updateMany({
    where: { year },
    data: { closed: false },
  });

  await writeAuditLog({
    userId: session.id,
    entityType: "AnnualArchive",
    entityId: existing.id,
    action: "REOPEN_YEAR",
    oldValue: existing,
    newValue: { year, reopened: true },
  });

  revalidateAll();
  return { success: true };
}

/** Crea un'utenza. Tutti gli utenti hanno gli stessi permessi. */
export async function createUserAction(formData: FormData) {
  const session = await requireSession();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = "ADMIN" as const; // stessi permessi per tutti

  if (!name || !email || password.length < 6) {
    return { error: "Nome, email e password (min. 6 caratteri) obbligatori" };
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "Email già registrata" };

  const { hashPassword } = await import("./auth");
  const hashed = await hashPassword(password);

  const user = await prisma.user.create({
    data: { name, email, password: hashed, role, active: true },
  });

  await writeAuditLog({
    userId: session.id,
    entityType: "User",
    entityId: user.id,
    action: "CREATE",
    newValue: { id: user.id, name, email, role },
  });

  revalidateAll();
  return { success: true };
}

/** Ogni utente loggato può cambiare la propria password. */
export async function changePasswordAction(formData: FormData) {
  const session = await requireSession();
  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!currentPassword || !newPassword) {
    return { error: "Compila tutti i campi password" };
  }
  if (newPassword.length < 6) {
    return { error: "La nuova password deve avere almeno 6 caratteri" };
  }
  if (newPassword !== confirmPassword) {
    return { error: "La nuova password e la conferma non coincidono" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || !user.active) return { error: "Utente non trovato" };

  const bcrypt = await import("bcryptjs");
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return { error: "Password attuale non corretta" };

  const { hashPassword } = await import("./auth");
  const hashed = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: session.id },
    data: { password: hashed },
  });

  await writeAuditLog({
    userId: session.id,
    entityType: "User",
    entityId: session.id,
    action: "CHANGE_PASSWORD",
    newValue: { changed: true },
  });

  revalidateAll();
  return { success: true };
}

/** Ogni utente può reimpostare la password di un altro utente. */
export async function resetUserPasswordAction(formData: FormData) {
  const session = await requireSession();

  const userId = String(formData.get("userId") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!userId) return { error: "Utente non valido" };
  if (userId === session.id) {
    return { error: "Per la tua password usa la sezione «Cambia password» sopra" };
  }
  if (!newPassword || newPassword.length < 6) {
    return { error: "La nuova password deve avere almeno 6 caratteri" };
  }
  if (newPassword !== confirmPassword) {
    return { error: "La nuova password e la conferma non coincidono" };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Utente non trovato" };

  const { hashPassword } = await import("./auth");
  const hashed = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  await writeAuditLog({
    userId: session.id,
    entityType: "User",
    entityId: userId,
    action: "RESET_PASSWORD",
    newValue: { targetEmail: user.email, targetName: user.name },
  });

  revalidateAll();
  return { success: true };
}

export async function toggleUserActiveAction(userId: string) {
  const session = await requireSession();
  if (userId === session.id) return { error: "Non puoi disattivare te stesso" };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Utente non trovato" };

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { active: !user.active },
  });

  await writeAuditLog({
    userId: session.id,
    entityType: "User",
    entityId: userId,
    action: "UPDATE",
    oldValue: { active: user.active },
    newValue: { active: updated.active },
  });

  revalidateAll();
  return { success: true };
}
