import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

export const COMPANY_TIME_ZONE = "America/New_York";

/** Parses a `datetime-local` input value (e.g. "2026-08-13T09:00") as a
 * wall-clock time in the company's timezone and returns the equivalent UTC Date. */
export function parseZonedDateTime(value: string): Date {
  return fromZonedTime(value, COMPANY_TIME_ZONE);
}

/** Formats a UTC Date as a `datetime-local` input value in the company's timezone. */
export function toDateTimeLocalValue(date: Date | null): string {
  if (!date) return "";
  return formatInTimeZone(date, COMPANY_TIME_ZONE, "yyyy-MM-dd'T'HH:mm");
}
