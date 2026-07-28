import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/format";
import { calcCustomerBalance } from "@/lib/calculations";

function sheetFromRows(
  wb: ExcelJS.Workbook,
  name: string,
  headers: string[],
  rows: Array<Array<string | number | Date | null | undefined>>,
) {
  const ws = wb.addWorksheet(name.slice(0, 31));
  ws.addRow(headers);
  ws.getRow(1).font = { bold: true };
  for (const row of rows) {
    ws.addRow(row.map((v) => (v === null || v === undefined ? "" : v)));
  }
  ws.columns.forEach((col) => {
    col.width = 14;
  });
  return ws;
}

function n(v: unknown) {
  return toNumber(v);
}

function d(v: Date | string | null | undefined) {
  if (!v) return "";
  const date = v instanceof Date ? v : new Date(v);
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  await requireSession();

  const [
    customers,
    suspended,
    master,
    commissions,
    layMovements,
    layClosures,
    withdrawals,
    cashFund,
    statement,
    snapshots,
    archives,
    users,
  ] = await Promise.all([
    prisma.customer.findMany({
      where: { deletedAt: null },
      include: { movements: { where: { deletedAt: null } } },
      orderBy: [{ surname: "asc" }, { name: "asc" }],
    }),
    prisma.suspendedMovement.findMany({
      where: { deletedAt: null },
      include: {
        customer: { select: { name: true, surname: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.masterMovement.findMany({
      where: { deletedAt: null },
      include: { createdBy: { select: { name: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.commissionMonth.findMany({
      orderBy: [{ year: "desc" }, { month: "asc" }],
    }),
    prisma.layMovement.findMany({
      where: { deletedAt: null },
      include: { createdBy: { select: { name: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.layMonthlyClosure.findMany({
      orderBy: [{ year: "asc" }, { month: "asc" }],
    }),
    prisma.withdrawal.findMany({
      where: { deletedAt: null },
      include: { createdBy: { select: { name: true } } },
      orderBy: [{ date: "desc" }],
    }),
    prisma.cashFundMovement.findMany({
      orderBy: [{ date: "desc" }],
    }),
    prisma.financialStatementCurrent.findUnique({ where: { id: "current" } }),
    prisma.financialStatementSnapshot.findMany({
      include: { createdBy: { select: { name: true } } },
      orderBy: { snapshotDate: "desc" },
    }),
    prisma.annualArchive.findMany({ orderBy: { year: "desc" } }),
    prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "BBET";
  wb.created = new Date();

  sheetFromRows(
    wb,
    "Riepilogo",
    ["Sezione", "Record", "Note"],
    [
      ["Clienti", customers.length, "Anagrafica attiva/non eliminata"],
      ["Movimenti Sospesi", suspended.length, "Dare/Avere"],
      ["Movimenti Master", master.length, ""],
      ["Commissioni mesi", commissions.length, ""],
      ["Movimenti LAY", layMovements.length, ""],
      ["Chiusure LAY", layClosures.length, ""],
      ["Prelievi", withdrawals.length, ""],
      ["Fondo cassa mov.", cashFund.length, ""],
      ["Snapshot rendiconto", snapshots.length, ""],
      ["Archivi annuali", archives.length, ""],
      ["Backup creato", 1, new Date().toISOString()],
    ],
  );

  sheetFromRows(
    wb,
    "Clienti",
    ["ID", "Cognome", "Nome", "Telefono", "Attivo", "Tot Dare", "Tot Avere", "Saldo", "N. mov", "Note"],
    customers.map((c) => {
      const t = calcCustomerBalance(c.movements);
      return [
        c.id,
        c.surname,
        c.name,
        c.phone ?? "",
        c.active ? "Sì" : "No",
        n(t.totalDare),
        n(t.totalAvere),
        n(t.balance),
        t.movementCount,
        c.notes ?? "",
      ];
    }),
  );

  sheetFromRows(
    wb,
    "Sospesi movimenti",
    ["ID", "Data", "Ora", "Cliente", "Tipo", "Importo", "Descrizione", "Note", "Utente"],
    suspended.map((m) => [
      m.id,
      d(m.date),
      m.time ?? "",
      `${m.customer.surname} ${m.customer.name}`,
      m.movementType,
      n(m.amount),
      m.description ?? "",
      m.notes ?? "",
      m.createdBy.name,
    ]),
  );

  sheetFromRows(
    wb,
    "Master",
    ["ID", "Data", "Ora", "Tipo", "Importo", "Dare/Avere", "Descrizione", "Note", "Utente"],
    master.map((m) => {
      const amount = n(m.amount);
      return [
        m.id,
        d(m.date),
        m.time ?? "",
        m.movementType,
        Math.abs(amount),
        amount >= 0 ? "Dare" : "Avere",
        m.description ?? "",
        m.notes ?? "",
        m.createdBy.name,
      ];
    }),
  );

  sheetFromRows(
    wb,
    "Commissioni",
    [
      "Anno",
      "Mese",
      "Fatt",
      "Bonus",
      "Lordo Casino",
      "Casino netto",
      "Netto Sport",
      "Prelievi",
      "Fondo cassa",
      "Parziale",
      "Finale",
      "Chiuso",
      "Note",
    ],
    commissions.map((m) => [
      m.year,
      m.month,
      n(m.invoiceAmount),
      n(m.bonusAmount),
      n(m.casinoGross),
      n(m.casinoNet),
      n(m.sportNet),
      n(m.withdrawals),
      n(m.cashFund),
      n(m.partialTotal),
      n(m.finalTotal),
      m.closed ? "Sì" : "No",
      m.notes ?? "",
    ]),
  );

  sheetFromRows(
    wb,
    "LAY movimenti",
    ["ID", "Data", "Ora", "Importo", "Categoria", "Tris", "Descrizione", "Note", "Utente"],
    layMovements.map((m) => [
      m.id,
      d(m.date),
      m.time ?? "",
      n(m.amount),
      m.category,
      m.category === "TRIS" ? "Sì" : "No",
      m.description ?? "",
      m.notes ?? "",
      m.createdBy.name,
    ]),
  );

  sheetFromRows(
    wb,
    "LAY chiusure",
    [
      "Anno",
      "Mese",
      "Positivo",
      "Negativo",
      "Saldo mese",
      "Tris +",
      "Tris −",
      "Tris saldo",
      "Cumulativo cassa",
      "N. mov",
      "Chiuso il",
      "Note",
    ],
    layClosures.map((c) => [
      c.year,
      c.month,
      n(c.positiveTotal),
      n(c.negativeTotal),
      n(c.monthlyBalance),
      n(c.trisPositive),
      n(c.trisNegative),
      n(c.trisBalance),
      n(c.cumulativeBalance),
      c.movementCount,
      d(c.closedAt),
      c.notes ?? "",
    ]),
  );

  const trisClosures = await prisma.trisMonthlyClosure.findMany({
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  sheetFromRows(
    wb,
    "Tris archivio",
    [
      "Anno",
      "Mese",
      "Dare",
      "Avere",
      "Saldo mese",
      "Cumulativo (debito)",
      "N. mov",
      "Chiuso il",
      "Note",
    ],
    trisClosures.map((c) => [
      c.year,
      c.month,
      n(c.dareTotal),
      n(c.avereTotal),
      n(c.monthlyBalance),
      n(c.cumulativeBalance),
      c.movementCount,
      d(c.closedAt),
      c.notes ?? "",
    ]),
  );

  sheetFromRows(
    wb,
    "Prelievi",
    ["ID", "Data", "Anno", "Importo", "Fonte", "Descrizione", "Note", "Utente"],
    withdrawals.map((w) => [
      w.id,
      d(w.date),
      w.year,
      n(w.amount),
      w.source,
      w.description ?? "",
      w.notes ?? "",
      w.createdBy.name,
    ]),
  );

  sheetFromRows(
    wb,
    "Fondo cassa",
    ["ID", "Data", "Tipo", "Importo", "Valore apertura", "Valore chiusura", "Motivo", "Note"],
    cashFund.map((m) => [
      m.id,
      d(m.date),
      m.movementType,
      n(m.amount),
      n(m.openingValue),
      n(m.closingValue),
      m.reason ?? "",
      m.notes ?? "",
    ]),
  );

  sheetFromRows(
    wb,
    "Rendiconto attuale",
    ["Campo", "Valore"],
    statement
      ? [
          ["Online", n(statement.online)],
          ["Credito± manuale", n(statement.manualCreditAdjustment)],
          ["Conti personali", n(statement.personalAccounts)],
          ["Contanti", n(statement.cash)],
          ["Monete", n(statement.coins)],
          ["Totale in cassa", n(statement.cashTotal)],
          ["Note", statement.notes ?? ""],
          ["Aggiornato", statement.updatedAt.toISOString()],
        ]
      : [["Nessun rendiconto", ""]],
  );

  sheetFromRows(
    wb,
    "Snapshot",
    [
      "Data",
      "Tipo",
      "Online",
      "Credito±",
      "Conti pers.",
      "Contanti",
      "Monete",
      "Sospesi",
      "Tris",
      "Master",
      "LAY",
      "Tot calc",
      "In cassa",
      "Diff",
      "Utente",
      "Note",
    ],
    snapshots.map((s) => [
      d(s.snapshotDate),
      s.snapshotType,
      n(s.online),
      n(s.manualCreditAdjustment),
      n(s.personalAccounts),
      n(s.cash),
      n(s.coins),
      n(s.suspendedCredit),
      n(s.tris),
      n(s.master),
      n(s.lay),
      n(s.calculatedTotal),
      n(s.cashTotal),
      n(s.difference),
      s.createdBy.name,
      s.notes ?? "",
    ]),
  );

  sheetFromRows(
    wb,
    "Archivio annuale",
    [
      "Anno",
      "FC apertura",
      "FC chiusura",
      "Sospesi",
      "Master",
      "LAY",
      "Commissioni",
      "Prelievi",
      "Finale",
      "Chiuso il",
    ],
    archives.map((a) => [
      a.year,
      n(a.openingCashFund),
      n(a.closingCashFund),
      n(a.suspendedBalance),
      n(a.masterBalance),
      n(a.layBalance),
      n(a.commissionTotal),
      n(a.withdrawalTotal),
      n(a.finalBalance),
      d(a.closedAt),
    ]),
  );

  sheetFromRows(
    wb,
    "Utenti",
    ["ID", "Nome", "Email", "Ruolo", "Attivo"],
    users.map((u) => [u.id, u.name, u.email, u.role, u.active ? "Sì" : "No"]),
  );

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const filename = `BBET-backup-${stamp}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
