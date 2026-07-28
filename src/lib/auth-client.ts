"use server";

import { headers } from "next/headers";
import { login as doLogin } from "./auth";
import { getClientIp } from "./security";

export async function login(email: string, password: string) {
  const h = await headers();
  const ip = getClientIp(h.get("x-forwarded-for"));
  return doLogin(email, password, ip);
}
