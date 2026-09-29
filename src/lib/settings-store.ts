import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { quadroStorage } from "@/lib/safe-storage";
import { useEffect, useState } from "react";
import type { BoardKit } from "@/lib/board-kits";
import type { ColumnId, PriorityId } from "@/lib/board-store";

export type WeekStart = "mon" | "sun";
export type Density = "comfortable" | "compact";
export type MotionPref = "full" | "reduce";
export type CalViewPref = "month" | "week" | "agenda";
export type HorizonDays = 7 | 14 | 30;

export type AppSettings = {
  studioName: string;
  defaultKit: BoardKit;
  defaultPriority: PriorityId;
  defaultColumn: ColumnId;
  dueHorizonDays: HorizonDays;
  autoSelectDue: boolean;
  weekStart: WeekStart;
  defaultCalView: CalViewPref;
  density: Density;
  motion: MotionPref;
  scramble: boolean;
  shortcuts: boolean;
  toasts: boolean;
  confirmDelete: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  studioName: "Studio",
  defaultKit: "work",
  defaultPriority: "med",
  defaultColumn: "todo",
  dueHorizonDays: 14,
  autoSelectDue: true,
  weekStart: "mon",
  defaultCalView: "month",
  density: "comfortable",
  motion: "full",
  scramble: true,
  shortcuts: true,
  toasts: true,
  confirmDelete: true,
};

const STORAGE_KEY = "quadro-settings-v1";

type SettingsState = AppSettings & {
  patch: (next: Partial<AppSettings>) => void;
  reset: () => void;
};

function oneOf<T extends string | number>(value: unknown, options: readonly T[], fallback: T): T {
  return options.find((option) => option === value) ?? fallback;
}

/**
 * Settings from any input — a store patch, localStorage, an imported file —
 * with every value checked against its list. Out-of-list values fall back to
 * the default, the studio name is trimmed and cut to 24 characters, and only
 * known keys survive.
 */
export function clampSettings(raw: unknown): AppSettings {
  const input = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const name = typeof input.studioName === "string" ? input.studioName.trim().slice(0, 24) : "";
  const flag = (value: unknown, fallback: boolean) =>
    typeof value === "boolean" ? value : fallback;
  return {
    studioName: name || DEFAULT_SETTINGS.studioName,
    defaultKit: oneOf(input.defaultKit, ["blank", "life", "work", "dev"] as const, "work"),
    defaultPriority: oneOf(input.defaultPriority, ["low", "med", "high"] as const, "med"),
    defaultColumn: oneOf(input.defaultColumn, ["todo", "doing", "done"] as const, "todo"),
    dueHorizonDays: oneOf(input.dueHorizonDays, [7, 14, 30] as const, 14),
    autoSelectDue: flag(input.autoSelectDue, DEFAULT_SETTINGS.autoSelectDue),
    weekStart: oneOf(input.weekStart, ["mon", "sun"] as const, "mon"),
    defaultCalView: oneOf(input.defaultCalView, ["month", "week", "agenda"] as const, "month"),
    density: oneOf(input.density, ["comfortable", "compact"] as const, "comfortable"),
    motion: oneOf(input.motion, ["full", "reduce"] as const, "full"),
    scramble: flag(input.scramble, DEFAULT_SETTINGS.scramble),
    shortcuts: flag(input.shortcuts, DEFAULT_SETTINGS.shortcuts),
    toasts: flag(input.toasts, DEFAULT_SETTINGS.toasts),
    confirmDelete: flag(input.confirmDelete, DEFAULT_SETTINGS.confirmDelete),
  };
}

/** The persisted part of the settings store: values only, no actions. */
export function pickSettings(state: AppSettings): AppSettings {
  return {
    studioName: state.studioName,
    defaultKit: state.defaultKit,
    defaultPriority: state.defaultPriority,
    defaultColumn: state.defaultColumn,
    dueHorizonDays: state.dueHorizonDays,
    autoSelectDue: state.autoSelectDue,
    weekStart: state.weekStart,
    defaultCalView: state.defaultCalView,
    density: state.density,
    motion: state.motion,
    scramble: state.scramble,
    shortcuts: state.shortcuts,
    toasts: state.toasts,
    confirmDelete: state.confirmDelete,
  };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      patch: (next) => set((state) => clampSettings({ ...pickSettings(state), ...next })),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(quadroStorage),
      skipHydration: true,
      version: 1,
      partialize: (state: SettingsState) => pickSettings(state),
      migrate: (persisted) => clampSettings(persisted),
      merge: (persisted, current) =>
        persisted === undefined ? current : { ...current, ...clampSettings(persisted) },
    },
  ),
);

export function useSettingsHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const finish = () => {
      if (active) setHydrated(true);
    };
    const unsub = useSettingsStore.persist.onFinishHydration(finish);
    void Promise.resolve(useSettingsStore.persist.rehydrate())
      .catch(() => undefined)
      .then(finish);
    if (useSettingsStore.persist.hasHydrated()) finish();
    return () => {
      active = false;
      unsub?.();
    };
  }, []);

  return hydrated;
}

export function studioInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Q";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

export const SETTINGS_STORAGE_KEY = STORAGE_KEY;
