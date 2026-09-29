import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `card_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

export function pluralizeSchede(count: number) {
  return count === 1 ? "1 scheda" : `${count} schede`;
}

export function pluralizeNote(count: number) {
  return count === 1 ? "1 nota" : `${count} note`;
}

export function pluralizeOfferte(count: number) {
  return count === 1 ? "1 offerta" : `${count} offerte`;
}

export function pluralizeSelected(count: number) {
  return count === 1 ? "1 selezionata" : `${count} selezionate`;
}

export function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

/**
 * Whole euros from what someone types: "4200", "4.200 €", "4.200,50" and
 * "4200.50" all land on about four thousand two hundred. The comma is the
 * decimal separator (it-IT); a dot followed by exactly three digits groups
 * thousands, any other dot is a decimal point. Cents are rounded and the
 * result is never negative. Stripping every non-digit instead turned
 * "1500,50" into 150050.
 */
export function parseEuro(raw: string) {
  const text = raw.replace(/[^\d.,]/g, "");
  if (!/\d/.test(text)) return 0;
  const comma = text.indexOf(",");
  let whole: string;
  let fraction = "";
  if (comma >= 0) {
    whole = text.slice(0, comma).replace(/\./g, "");
    fraction = text.slice(comma + 1).replace(/[^\d]/g, "");
  } else {
    const groups = text.split(".");
    if (groups.length > 1 && groups[groups.length - 1].length !== 3) {
      fraction = groups.pop() ?? "";
    }
    whole = groups.join("");
  }
  const n = Number(`${whole || "0"}.${fraction || "0"}`);
  return Number.isFinite(n) ? Math.min(Math.max(0, Math.round(n)), Number.MAX_SAFE_INTEGER) : 0;
}
