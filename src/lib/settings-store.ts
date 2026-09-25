import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
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

function getStorage() {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  return localStorage;
}

function clampSettings(raw: Partial<AppSettings> | undefined): AppSettings {
  const next = { ...DEFAULT_SETTINGS, ...raw };
  const name = next.studioName.trim().slice(0, 24);
  next.studioName = name || DEFAULT_SETTINGS.studioName;
  if (!["blank", "life", "work", "dev"].includes(next.defaultKit)) next.defaultKit = "work";
  if (!["low", "med", "high"].includes(next.defaultPriority)) next.defaultPriority = "med";
  if (!["todo", "doing", "done"].includes(next.defaultColumn)) next.defaultColumn = "todo";
  if (![7, 14, 30].includes(next.dueHorizonDays)) next.dueHorizonDays = 14;
  if (next.weekStart !== "sun") next.weekStart = "mon";
  if (!["month", "week", "agenda"].includes(next.defaultCalView)) next.defaultCalView = "month";
  if (next.density !== "compact") next.density = "comfortable";
  if (next.motion !== "reduce") next.motion = "full";
  next.autoSelectDue = Boolean(next.autoSelectDue);
  next.scramble = next.scramble !== false;
  next.shortcuts = next.shortcuts !== false;
  next.toasts = next.toasts !== false;
  next.confirmDelete = next.confirmDelete !== false;
  return next;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      patch: (next) => set((state) => clampSettings({ ...state, ...next })),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(getStorage),
      skipHydration: true,
      version: 1,
      partialize: (state) => ({
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
      }),
      migrate: (persisted) => clampSettings(persisted as Partial<AppSettings>),
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
