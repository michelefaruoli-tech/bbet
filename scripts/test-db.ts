import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL mancante");
  console.log("Host:", url.split("@")[1]?.split("/")[0]);

  const adapter = new PrismaNeonHttp(url, { arrayMode: false, fullResults: true });
  const prisma = new PrismaClient({ adapter });
  const count = await prisma.user.count();
  console.log("OK users =", count);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
