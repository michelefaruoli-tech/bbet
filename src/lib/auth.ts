import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { Role } from "@/generated/prisma/client";
import { prisma } from "./prisma";
import { writeAuditLog } from "./audit";
import { isLoginBlocked, recordLoginAttempt } from "./login-rate-limit";
import { isProduction, validateAuthSecret } from "./security";

const SESSION_COOKIE = "bbet_session";
const SESSION_DURATION = isProduction() ? 60 * 60 * 12 : 60 * 60 * 24 * 7;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

function getSecret() {
  validateAuthSecret();
  return new TextEncoder().encode(process.env.AUTH_SECRET);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "strict",
    maxAge: SESSION_DURATION,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireSession();
  if (session.role !== "ADMIN") redirect("/");
  return session;
}

export async function login(email: string, password: string, ip: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return { error: "Credenziali non valide" };
  }

  if (await isLoginBlocked(normalizedEmail, ip)) {
    return { error: "Troppi tentativi falliti. Riprova tra 15 minuti." };
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || !user.active) {
    await recordLoginAttempt(normalizedEmail, ip, false);
    return { error: "Credenziali non valide" };
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    await recordLoginAttempt(normalizedEmail, ip, false);
    return { error: "Credenziali non valide" };
  }

  await recordLoginAttempt(normalizedEmail, ip, true);

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  await writeAuditLog({
    userId: user.id,
    entityType: "User",
    entityId: user.id,
    action: "LOGIN",
  });

  return { success: true };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}
