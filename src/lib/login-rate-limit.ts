import { prisma } from "./prisma";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function isLoginBlocked(email: string, ip: string) {
  const since = new Date(Date.now() - WINDOW_MS);
  const failed = await prisma.loginAttempt.count({
    where: {
      success: false,
      createdAt: { gte: since },
      OR: [{ email: email.toLowerCase() }, { ip }],
    },
  });
  return failed >= MAX_ATTEMPTS;
}

export async function recordLoginAttempt(email: string, ip: string, success: boolean) {
  await prisma.loginAttempt.create({
    data: {
      email: email.toLowerCase(),
      ip,
      success,
    },
  });
}
