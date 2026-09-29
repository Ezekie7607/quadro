import { create } from "zustand";

export type CreateKind = "card" | "note" | "deal" | "space";

/** An item the palette found, to be opened by the page that owns it. */
export type OpenTarget = { kind: "card" | "deal" | "note"; spaceId: string; id: string };

type UiState = {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  pendingCreate: CreateKind | null;
  /** The space a create is meant for; `null` lets any page of that kind take it. */
  pendingCreateSpace: string | null;
  pendingOpen: OpenTarget | null;
  /** Bumped by every request, so asking for the same thing twice still fires. */
  pendingSeq: number;
  requestCreate: (kind: CreateKind, spaceId?: string) => void;
  consumeCreate: (kind: CreateKind, spaceId?: string) => boolean;
  requestOpen: (target: OpenTarget) => void;
  /** The id waiting for this page, cleared once read; `null` when none is. */
  consumeOpen: (kind: OpenTarget["kind"], spaceId: string) => string | null;
};

export const useUiStore = create<UiState>((set, get) => ({
  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  pendingCreate: null,
  pendingCreateSpace: null,
  pendingOpen: null,
  pendingSeq: 0,
  requestCreate: (kind, spaceId) =>
    set((state) => ({
      pendingCreate: kind,
      pendingCreateSpace: spaceId ?? null,
      pendingOpen: null,
      pendingSeq: state.pendingSeq + 1,
      paletteOpen: false,
    })),
  consumeCreate: (kind, spaceId) => {
    const { pendingCreate, pendingCreateSpace } = get();
    if (pendingCreate !== kind) return false;
    if (pendingCreateSpace && spaceId && pendingCreateSpace !== spaceId) return false;
    set({ pendingCreate: null, pendingCreateSpace: null });
    return true;
  },
  requestOpen: (target) =>
    set((state) => ({
      pendingOpen: target,
      pendingCreate: null,
      pendingCreateSpace: null,
      pendingSeq: state.pendingSeq + 1,
      paletteOpen: false,
    })),
  consumeOpen: (kind, spaceId) => {
    const target = get().pendingOpen;
    if (!target || target.kind !== kind || target.spaceId !== spaceId) return null;
    set({ pendingOpen: null });
    return target.id;
  },
}));
