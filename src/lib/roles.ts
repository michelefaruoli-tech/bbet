import { Role } from "@/generated/prisma/client";

/** Etichette italiane: ADMIN = Master, OPERATOR = Collaboratore */
export function roleLabel(role: Role | string): string {
  return role === "ADMIN" ? "Master" : "Collaboratore";
}

export function isMaster(role: Role | string): boolean {
  return role === "ADMIN";
}
