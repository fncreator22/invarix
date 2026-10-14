import { format, formatDistanceStrict, isSameDay } from "date-fns";

/** API timestamps are epoch seconds. */
export const toDate = (epochSeconds: number) => new Date(epochSeconds * 1000);
export const toEpoch = (d: Date) => Math.floor(d.getTime() / 1000);

/** "22 Oct 2026, 00:00" (05 §16). */
export const formatAbsolute = (epochSeconds: number) => format(toDate(epochSeconds), "d MMM yyyy, HH:mm");
export const formatDay = (epochSeconds: number) => format(toDate(epochSeconds), "d MMM yyyy");
export const formatShortDay = (epochSeconds: number) => format(toDate(epochSeconds), "d MMM");

/** "in 5 days" / "3 days ago" / "today", relative to the workspace clock. */
export function formatRelative(epochSeconds: number, baseEpochSeconds: number): string {
  const d = toDate(epochSeconds);
  const base = toDate(baseEpochSeconds);
  if (Math.abs(epochSeconds - baseEpochSeconds) < 60) return "just now";
  if (isSameDay(d, base) && Math.abs(epochSeconds - baseEpochSeconds) >= 3600 * 6) return "today";
  return formatDistanceStrict(d, base, { addSuffix: true, roundingMethod: "round" });
}

/** `exc_01H…9XQ`: keep the prefix plus a few characters each side. */
export function middleTruncate(id: string, head = 3, tail = 3): string {
  const sep = id.indexOf("_");
  const prefix = sep >= 0 ? id.slice(0, sep + 1) : "";
  const body = id.slice(prefix.length);
  if (body.length <= head + tail + 1) return id;
  return `${prefix}${body.slice(0, head)}…${body.slice(-tail)}`;
}

export const formatNumber = (n: number) => new Intl.NumberFormat("en-GB").format(n);

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

/** "DEPENDS_ON" → "depends on". */
export const humanizeEdge = (type: string) => type.toLowerCase().replace(/_/g, " ");

/** Workspace as-of dates are midnight UTC; format them in UTC so every timezone sees the same day. */
const UTC_DAY = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
export const formatUtcDay = (epochSeconds: number) => UTC_DAY.format(toDate(epochSeconds));
export const toUtcDateInput = (epochSeconds: number) => toDate(epochSeconds).toISOString().slice(0, 10);
