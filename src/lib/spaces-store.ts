import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import { createId } from "@/lib/utils";

export const SPACE_TYPES = ["board", "sales", "notes"] as const;
export type SpaceType = (typeof SPACE_TYPES)[number];

export type Space = {
  id: string;
  type: SpaceType;
  title: string;
  createdAt: number;
};

export const DEFAULT_BOARD_ID = "space-bacheca";
export const DEFAULT_SALES_ID = "space-vendite";
export const DEFAULT_NOTES_ID = "space-note";

export const SPACE_META: Record<
  SpaceType,
  { title: string; hint: string; headlines: [string, string] }
> = {
  board: {
    title: "Bacheca",
    hint: "Lavoro, casa, sprint",
    headlines: ["Le cose da fare,", "in tre colonne."],
  },
  sales: {
    title: "Vendite",
    hint: "Pipeline e euro",
    headlines: ["Le trattative,", "in tre fasi."],
  },
  notes: {
    title: "Note",
    hint: "Idee e liste",
    headlines: ["Appunti,", "quando servono."],
  },
};

export const DEFAULT_SPACES: Space[] = [
  {
    id: DEFAULT_BOARD_ID,
    type: "board",
    title: "Bacheca",
    createdAt: 1,
  },
  {
    id: DEFAULT_SALES_ID,
    type: "sales",
    title: "Vendite",
    createdAt: 2,
  },
  {
    id: DEFAULT_NOTES_ID,
    type: "notes",
    title: "Note",
    createdAt: 3,
  },
];

type SpacesState = {
  spaces: Space[];
  addSpace: (type: SpaceType, title: string) => string;
  renameSpace: (id: string, title: string) => void;
  deleteSpace: (id: string) => void;
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

export function isSpaceType(value: string): value is SpaceType {
  return (SPACE_TYPES as readonly string[]).includes(value);
}

export function nextSpaceTitle(type: SpaceType, spaces: Space[]) {
  const base = SPACE_META[type].title;
  const taken = new Set(spaces.map((space) => space.title.trim().toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`.toLowerCase())) n += 1;
  return `${base} ${n}`;
}

export const useSpacesStore = create<SpacesState>()(
  persist(
    (set) => ({
      spaces: DEFAULT_SPACES,
      addSpace: (type, title) => {
        const id = createId();
        const space: Space = {
          id,
          type,
          title: title.trim() || SPACE_META[type].title,
          createdAt: Date.now(),
        };
        set((state) => ({ spaces: [...state.spaces, space] }));
        return id;
      },
      renameSpace: (id, title) => {
        const next = title.trim();
        if (!next) return;
        set((state) => ({
          spaces: state.spaces.map((space) =>
            space.id === id ? { ...space, title: next } : space,
          ),
        }));
      },
      deleteSpace: (id) => {
        set((state) => ({ spaces: state.spaces.filter((space) => space.id !== id) }));
      },
    }),
    {
      name: "quadro-spaces-v1",
      storage: createJSONStorage(getStorage),
      skipHydration: true,
      partialize: (state) => ({ spaces: state.spaces }),
      version: 1,
    },
  ),
);

export function useSpacesHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const finish = () => {
      if (active) setHydrated(true);
    };
    const unsub = useSpacesStore.persist.onFinishHydration(finish);
    void Promise.resolve(useSpacesStore.persist.rehydrate())
      .catch(() => undefined)
      .then(finish);
    if (useSpacesStore.persist.hasHydrated()) finish();
    return () => {
      active = false;
      unsub?.();
    };
  }, []);

  return hydrated;
}
