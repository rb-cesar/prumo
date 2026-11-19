/** Datas como texto `AAAA-MM-DD`, sem hora e sem fuso. */

const MILLISECONDS_PER_DAY = 86_400_000;

export function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatIsoDate(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return formatIsoDate(parseIsoDate(value)) === value;
}

export function addDays(isoDate: string, days: number): string {
  return formatIsoDate(new Date(parseIsoDate(isoDate).getTime() + days * MILLISECONDS_PER_DAY));
}

export function daysBetween(fromIsoDate: string, toIsoDate: string): number {
  return Math.round(
    (parseIsoDate(toIsoDate).getTime() - parseIsoDate(fromIsoDate).getTime()) /
      MILLISECONDS_PER_DAY,
  );
}
