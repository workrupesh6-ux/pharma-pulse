const IST_TIME_ZONE = "Asia/Kolkata";

const EMPTY = "—";

/** Prices print in Indian digit grouping, e.g. 1,23,456.78. */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY;
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatSignedPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY;
  const sign = value > 0 ? "+" : value < 0 ? "\u2212" : "";
  return `${sign}${formatPrice(Math.abs(value))}`;
}

export function formatPercent(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY;
  const sign = value > 0 ? "+" : value < 0 ? "\u2212" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

/** Volumes in the Indian market read as lakh and crore, not million. */
export function formatVolume(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY;
  if (value >= 1e7) return `${(value / 1e7).toFixed(2)} Cr`;
  if (value >= 1e5) return `${(value / 1e5).toFixed(2)} L`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)} K`;
  return value.toFixed(0);
}

export type Direction = "up" | "down" | "flat";

export function direction(changePercent: number | null | undefined): Direction {
  if (changePercent === null || changePercent === undefined || changePercent === 0) return "flat";
  return changePercent > 0 ? "up" : "down";
}

export function directionClass(changePercent: number | null | undefined): string {
  switch (direction(changePercent)) {
    case "up":
      return "text-gain";
    case "down":
      return "text-loss";
    default:
      return "text-muted-foreground";
  }
}

export function directionMark(changePercent: number | null | undefined): string {
  switch (direction(changePercent)) {
    case "up":
      return "\u25B2";
    case "down":
      return "\u25BC";
    default:
      return "\u2014";
  }
}

type IstParts = {
  weekday: string;
  day: string;
  month: string;
  year: string;
  hour: number;
  minute: number;
  dayOfYear: number;
};

export function istParts(date: Date): IstParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const month = pick("month");
  const day = pick("day");
  const year = Number(pick("year"));
  const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
  const start = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, monthIndex, Number(day));

  return {
    weekday: pick("weekday"),
    day,
    month,
    year: pick("year"),
    hour: Number(pick("hour")),
    minute: Number(pick("minute")),
    dayOfYear: Math.floor((current - start) / 86_400_000) + 1,
  };
}

/** e.g. "Thursday, 24 September 2026" */
export function formatEditionDate(date: Date): string {
  const { weekday, day, month, year } = istParts(date);
  return `${weekday}, ${day} ${month} ${year}`;
}

/** e.g. "4:31:22 pm IST". Accepts a Date or an epoch-milliseconds timestamp. */
export function formatClock(at: Date | number | null | undefined): string {
  if (at === null || at === undefined) return EMPTY;
  const date = typeof at === "number" ? new Date(at) : at;
  return `${new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date)} IST`;
}

/** Issue number for the masthead — a fresh "edition" every day. */
export function editionNumber(date: Date): string {
  return String(istParts(date).dayOfYear).padStart(3, "0");
}

export type MarketState = "open" | "closed";

/**
 * NSE cash-market hours: 09:15–15:30 IST, Monday to Friday.
 * Does not account for trading holidays.
 */
export function marketState(date: Date): MarketState {
  const { weekday, hour, minute } = istParts(date);
  if (weekday === "Saturday" || weekday === "Sunday") return "closed";
  const minutes = hour * 60 + minute;
  return minutes >= 9 * 60 + 15 && minutes <= 15 * 60 + 30 ? "open" : "closed";
}

/** "just now" / "42s ago" / "3m ago" — for the last-tape note. */
export function formatRelative(timestamp: number | null | undefined, now: number): string {
  if (!timestamp) return EMPTY;
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}
