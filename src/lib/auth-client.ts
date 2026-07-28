"use server";

import { login as doLogin } from "./auth";

export async function login(email: string, password: string) {
  return doLogin(email, password);
}
