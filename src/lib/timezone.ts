import { formatInTimeZone } from "date-fns-tz";

export const TIMEZONE = "Europe/Rome";

export function nowInRome(): Date {
  return new Date();
}

export function formatDateIT(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, TIMEZONE, "dd/MM/yyyy");
}

export function formatDateTimeIT(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, TIMEZONE, "dd/MM/yyyy HH:mm");
}

/** Ora corrente a Roma nel formato HH:mm (per i campi time dei movimenti) */
export function formatTimeIT(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, TIMEZONE, "HH:mm");
}

export function parseItalianDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  if (isNaN(d.getTime())) return null;
  return d;
}
