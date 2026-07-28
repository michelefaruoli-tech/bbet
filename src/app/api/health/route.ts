import { NextResponse } from "next/server";
import { SECURITY_HEADERS } from "@/lib/security";

export async function GET() {
  const response = NextResponse.json({ status: "ok" });
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}
