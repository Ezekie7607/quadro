const WEEKDAYS = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"] as const;
const WEEKDAYS_LONG = [
  "lunedì",
  "martedì",
  "mercoledì",
  "giovedì",
  "venerdì",
  "sabato",
  "domenica",
] as const;

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function toIsoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayIso() {
  return toIsoDate(new Date());
}

export function parseIsoDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function addDaysIso(amount: number, from = todayIso()) {
  return toIsoDate(addDays(parseIsoDate(from), amount));
}

export function startOfWeek(date: Date, weekStartsOn: 0 | 1 = 1) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = next.getDay();
  const offset = weekStartsOn === 0 ? -day : day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + offset);
  return next;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function monthCells(date: Date, weekStartsOn: 0 | 1 = 1) {
  const start = startOfWeek(startOfMonth(date), weekStartsOn);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function weekDays(date: Date, weekStartsOn: 0 | 1 = 1) {
  const start = startOfWeek(date, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function weekdayStrip(weekStartsOn: 0 | 1 = 1) {
  if (weekStartsOn === 1) return WEEKDAYS;
  return ["dom", "lun", "mar", "mer", "gio", "ven", "sab"] as const;
}

export function formatDayShort(iso: string) {
  return parseIsoDate(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  });
}

export function formatDayLong(iso: string) {
  return parseIsoDate(iso).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatMonthYear(date: Date) {
  return date.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}

export function weekdayLabel(date: Date, long = false) {
  const day = date.getDay();
  const index = day === 0 ? 6 : day - 1;
  return long ? WEEKDAYS_LONG[index] : WEEKDAYS[index];
}

export function formatDueLabel(iso: string) {
  const today = todayIso();
  if (iso === today) return "Oggi";
  const base = parseIsoDate(today);
  if (iso === toIsoDate(addDays(base, 1))) return "Domani";
  if (iso === toIsoDate(addDays(base, -1))) return "Ieri";
  return formatDayShort(iso);
}

export function formatDayHeading(iso: string) {
  const today = todayIso();
  if (iso === today) return "Oggi";
  const base = parseIsoDate(today);
  if (iso === toIsoDate(addDays(base, 1))) return "Domani";
  if (iso === toIsoDate(addDays(base, -1))) return "Ieri";
  return formatDayLong(iso);
}

export type DueTone = "overdue" | "today" | "later";

export function dueTone(iso: string): DueTone {
  const today = todayIso();
  if (iso < today) return "overdue";
  if (iso === today) return "today";
  return "later";
}

export function formatTodayLine(date = new Date()) {
  const raw = date.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function formatRelativeTime(ts: number) {
  if (!Number.isFinite(ts) || ts < 1_577_836_800_000) return "";
  const diff = Date.now() - ts;
  if (diff < 45_000) return "Adesso";
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return minutes === 1 ? "1 min fa" : `${minutes} min fa`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 ora fa" : `${hours} ore fa`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Ieri";
  if (days < 7) return `${days} giorni fa`;
  return new Date(ts).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  });
}

export { WEEKDAYS };
