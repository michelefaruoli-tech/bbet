import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function ensureUser(data: {
  email: string;
  password: string;
  name: string;
  role: "ADMIN" | "OPERATOR";
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (!existing) {
    await prisma.user.create({ data });
  }
}

async function main() {
  const adminHash = await bcrypt.hash("Admin123!", 10);
  const operatorHash = await bcrypt.hash("Operatore123!", 10);

  await ensureUser({
    email: "admin@bbet.local",
    password: adminHash,
    name: "Amministratore",
    role: "ADMIN",
  });

  await ensureUser({
    email: "operatore@bbet.local",
    password: operatorHash,
    name: "Operatore",
    role: "OPERATOR",
  });

  const current = await prisma.financialStatementCurrent.findUnique({ where: { id: "current" } });
  if (!current) {
    await prisma.financialStatementCurrent.create({ data: { id: "current" } });
  }

  const year = new Date().getFullYear();
  for (let month = 1; month <= 12; month++) {
    const existing = await prisma.commissionMonth.findFirst({ where: { year, month } });
    if (!existing) {
      await prisma.commissionMonth.create({ data: { year, month } });
    }
  }

  console.log("Seed BBET completato.");
  console.log("Admin: admin@bbet.local / Admin123!");
  console.log("Operatore: operatore@bbet.local / Operatore123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
