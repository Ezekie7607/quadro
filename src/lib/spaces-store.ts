import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { quadroStorage } from "@/lib/safe-storage";
import { useEffect, useState } from "react";
import { cleanText, cleanTimestamp, isRecord, isSafeId } from "@/lib/sanitize";
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

export function isSpaceType(value: string): value is SpaceType {
  return (SPACE_TYPES as readonly string[]).includes(value);
}

export const SPACE_TITLE_MAX = 40;

/**
 * A clean `Space[]` from untrusted input, or `null` when it is not a list at
 * all. Entries without a usable id or type are dropped, titles are trimmed and
 * capped, duplicate ids keep the first occurrence.
 */
export function normalizeSpaces(raw: unknown): Space[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<string>();
  const spaces: Space[] = [];
  raw.forEach((item, index) => {
    if (!isRecord(item) || !isSafeId(item.id) || seen.has(item.id)) return;
    if (typeof item.type !== "string" || !isSpaceType(item.type)) return;
    seen.add(item.id);
    spaces.push({
      id: item.id,
      type: item.type,
      // Stored or imported duplicates get their number too (§5).
      title: uniqueSpaceTitle(
        cleanText(item.title, SPACE_TITLE_MAX).trim() || SPACE_META[item.type].title,
        spaces,
      ),
      createdAt: cleanTimestamp(item.createdAt, index + 1),
    });
  });
  return spaces;
}

/**
 * A title no other space uses (§5): a duplicate gets the next free number,
 * "Bacheca" → "Bacheca 2". `exceptId` is the space being renamed.
 */
export function uniqueSpaceTitle(title: string, spaces: Space[], exceptId?: string) {
  const taken = new Set(
    spaces
      .filter((space) => space.id !== exceptId)
      .map((space) => space.title.trim().toLowerCase()),
  );
  const base = title.slice(0, SPACE_TITLE_MAX);
  if (!taken.has(base.toLowerCase())) return base;
  for (let n = 2; ; n += 1) {
    const suffix = ` ${n}`;
    // The number has to fit inside the cap: a longer title would be cut on the
    // next load, losing the number and bringing the duplicate back.
    const candidate = `${base.slice(0, SPACE_TITLE_MAX - suffix.length).trimEnd()}${suffix}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
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
        set((state) => {
          const base = title.trim().slice(0, SPACE_TITLE_MAX) || SPACE_META[type].title;
          const space: Space = {
            id,
            type,
            title: uniqueSpaceTitle(base, state.spaces),
            createdAt: Date.now(),
          };
          return { spaces: [...state.spaces, space] };
        });
        return id;
      },
      renameSpace: (id, title) => {
        const next = title.trim().slice(0, SPACE_TITLE_MAX);
        if (!next) return;
        set((state) => {
          const title = uniqueSpaceTitle(next, state.spaces, id);
          return {
            spaces: state.spaces.map((space) => (space.id === id ? { ...space, title } : space)),
          };
        });
      },
      deleteSpace: (id) => {
        set((state) => ({ spaces: state.spaces.filter((space) => space.id !== id) }));
      },
    }),
    {
      name: "quadro-spaces-v1",
      storage: createJSONStorage(quadroStorage),
      skipHydration: true,
      partialize: (state) => ({ spaces: state.spaces }),
      version: 1,
      merge: (persisted, current) => {
        const spaces = normalizeSpaces(isRecord(persisted) ? persisted.spaces : undefined);
        return spaces ? { ...current, spaces } : current;
      },
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
