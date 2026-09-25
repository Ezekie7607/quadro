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

export function parseEuro(raw: string) {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}
