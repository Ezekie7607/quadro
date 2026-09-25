import { create } from "zustand";

export type CreateKind = "card" | "note" | "deal" | "space";

type UiState = {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  pendingCreate: CreateKind | null;
  pendingSeq: number;
  requestCreate: (kind: CreateKind) => void;
  consumeCreate: (kind: CreateKind) => boolean;
};

export const useUiStore = create<UiState>((set, get) => ({
  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  pendingCreate: null,
  pendingSeq: 0,
  requestCreate: (kind) =>
    set((state) => ({
      pendingCreate: kind,
      pendingSeq: state.pendingSeq + 1,
      paletteOpen: false,
    })),
  consumeCreate: (kind) => {
    if (get().pendingCreate !== kind) return false;
    set({ pendingCreate: null });
    return true;
  },
}));
