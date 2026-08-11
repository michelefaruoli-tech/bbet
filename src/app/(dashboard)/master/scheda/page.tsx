import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calcMasterBalance } from "@/lib/calculations";
import { requireSession } from "@/lib/auth";
import { isMaster } from "@/lib/roles";
import { formatEUR, amountClass, toNumber } from "@/lib/format";
import { formatDateIT } from "@/lib/timezone";
import { Card } from "@/components/ui";
import { MasterMovementForm } from "@/components/master/master-movement-form";
import { QuickMasterRow } from "@/components/master/quick-master-row";
import {
  MasterMovementsTable,
  type MasterMovementRow,
} from "@/components/master/master-movements-table";

function masterDareAvereLabel(amount: number, movementType: string) {
  if (amount > 0) return "Avere";
  if (amount < 0) return "Dare";
  return movementType;
}

export default async function MasterSchedaPage() {
  const session = await requireSession();
  const showAuthor = isMaster(session.role);
  const movements = await prisma.masterMovement.findMany({
    where: { deletedAt: null },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { createdBy: { select: { name: true } } },
  });

  const balance = calcMasterBalance(movements);
  const totalAvere = movements
    .filter((m) => toNumber(m.amount) > 0)
    .reduce((s, m) => s + toNumber(m.amount), 0);
  const totalDare = movements
    .filter((m) => toNumber(m.amount) < 0)
    .reduce((s, m) => s + Math.abs(toNumber(m.amount)), 0);

  const movementRows: MasterMovementRow[] = movements.map((m) => {
    const amount = toNumber(m.amount);
    return {
      id: m.id,
      dateLabel: `${formatDateIT(m.date)}${m.time ? ` ${m.time}` : ""}`,
      tipo: masterDareAvereLabel(amount, m.movementType),
      movementType: m.movementType,
      amount,
      amountLabel: formatEUR(Math.abs(amount)),
      description: m.description ?? "—",
      notes: m.notes,
      authorName: m.createdBy.name,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/master" className="text-sm text-emerald-600 hover:underline">
          ← Torna al Master
        </Link>
        <h1 className="text-2xl font-bold">Scheda Master</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card title="Totale Avere (+)">
          <p className="text-xl font-bold text-emerald-600">{formatEUR(totalAvere)}</p>
          <p className="mt-1 text-xs text-slate-400">Master deve a noi</p>
        </Card>
        <Card title="Totale Dare (−)">
          <p className="text-xl font-bold text-red-600">{formatEUR(totalDare)}</p>
          <p className="mt-1 text-xs text-slate-400">Noi a loro</p>
        </Card>
        <Card title="Saldo attuale">
          <p className={`text-xl font-bold ${amountClass(balance)}`}>{formatEUR(balance)}</p>
          <p className="mt-1 text-xs text-slate-400">
            {balance > 0 ? "Loro devono a noi" : balance < 0 ? "Noi dobbiamo a loro" : "In pari"}
          </p>
        </Card>
        <Card title="Movimenti">
          <p className="text-xl font-bold">{movements.length}</p>
        </Card>
      </div>

      <Card title="Inserimento rapido Avere/Dare">
        <p className="mb-2 text-sm text-slate-500">
          Avere (+) = Master deve a noi · Dare (−) = noi dobbiamo a loro
        </p>
        <QuickMasterRow />
      </Card>

      <Card title="Nuovo movimento (completo)">
        <p className="mb-3 text-sm text-slate-500">
          Usa questo form se ti serve data diversa da oggi, descrizione o note.
        </p>
        <MasterMovementForm />
      </Card>

      <Card title="Cronologia operazioni">
        <MasterMovementsTable rows={movementRows} showAuthor={showAuthor} />
      </Card>
    </div>
  );
}
