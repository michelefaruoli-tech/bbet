import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

export function toCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [headers.map(escape).join(";"), ...rows.map((r) => r.map(escape).join(";"))].join("\n");
}

export async function csvResponse(filename: string, headers: string[], rows: string[][]) {
  await requireSession();
  const bom = "\uFEFF";
  const body = bom + toCsv(headers, rows);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
