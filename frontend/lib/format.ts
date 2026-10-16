import { format, formatDistanceStrict, isSameDay } from "date-fns";

/** API timestamps can be epoch seconds, milliseconds, ISO strings, or Date objects. */
export const toDate = (val: unknown): Date => {
  if (!val) return new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
  if (typeof val === "number") {
    if (isNaN(val) || !isFinite(val)) return new Date();
    // If epoch seconds (< 1e11), multiply by 1000. If ms, use as-is.
    return val < 1e11 ? new Date(val * 1000) : new Date(val);
  }
  if (typeof val === "string") {
    const num = Number(val);
    if (!isNaN(num) && isFinite(num) && val.trim() !== "") {
      return num < 1e11 ? new Date(num * 1000) : new Date(num);
    }
    const parsed = new Date(val);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  return new Date();
};

export const toEpoch = (d: Date) => Math.floor(d.getTime() / 1000);

/** "22 Oct 2026, 00:00" (05 §16). */
export const formatAbsolute = (epochSeconds: unknown) => {
  try {
    return format(toDate(epochSeconds), "d MMM yyyy, HH:mm");
  } catch {
    return "Recent";
  }
};

export const formatDay = (epochSeconds: unknown) => {
  try {
    return format(toDate(epochSeconds), "d MMM yyyy");
  } catch {
    return "Recent";
  }
};

export const formatShortDay = (epochSeconds: unknown) => {
  try {
    return format(toDate(epochSeconds), "d MMM");
  } catch {
    return "Recent";
  }
};

/** "in 5 days" / "3 days ago" / "today", relative to the workspace clock. */
export function formatRelative(epochSeconds: unknown, baseEpochSeconds: unknown): string {
  try {
    const d = toDate(epochSeconds);
    const base = toDate(baseEpochSeconds);
    const diff = Math.abs(d.getTime() - base.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (isSameDay(d, base) && diff >= 3600 * 6) return "today";
    return formatDistanceStrict(d, base, { addSuffix: true, roundingMethod: "round" });
  } catch {
    return "recently";
  }
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
export const formatUtcDay = (val: unknown) => {
  try {
    const d = toDate(val);
    if (isNaN(d.getTime())) return "Recent";
    return UTC_DAY.format(d);
  } catch {
    return "Recent";
  }
};

export const toUtcDateInput = (val: unknown) => {
  try {
    const d = toDate(val);
    if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
    return d.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};
