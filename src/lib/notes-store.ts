import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createId } from "@/lib/utils";
import { DEFAULT_NOTES_ID } from "@/lib/spaces-store";
import { useEffect, useState } from "react";

export type NoteFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "queued" | "uploading" | "success" | "error";
};

export type Note = {
  id: string;
  title: string;
  body: string;
  attachments: NoteFile[];
  createdAt: number;
  updatedAt: number;
};

const SEED_NOTES: Note[] = [
  {
    id: "note-1",
    title: "Idee per la settimana",
    body: "Rivedere i testi della landing, preparare tre varianti per i Reels, e chiudere il preventivo stampa.",
    attachments: [],
    createdAt: 1,
    updatedAt: 3,
  },
  {
    id: "note-2",
    title: "Da non dimenticare",
    body: "Chiedere i file originali delle foto prodotto. Tenere da parte i riferimenti visivi del catalogo 2025.",
    attachments: [
      {
        id: "att-catalogo",
        name: "catalogo-2025.pdf",
        size: 2_400_000,
        type: "application/pdf",
        progress: 100,
        status: "success",
      },
    ],
    createdAt: 2,
    updatedAt: 2,
  },
];

export const EMPTY_NOTES: Note[] = [];

type NotesState = {
  notebooks: Record<string, Note[]>;
  ensureNotes: (spaceId: string) => void;
  removeNotes: (spaceId: string) => void;
  addNote: (spaceId: string, title: string, body: string, attachments?: NoteFile[]) => string;
  updateNote: (
    spaceId: string,
    id: string,
    title: string,
    body: string,
    attachments?: NoteFile[],
  ) => void;
  deleteNote: (spaceId: string, id: string) => void;
  deleteMany: (spaceId: string, ids: string[]) => void;
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

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notebooks: { [DEFAULT_NOTES_ID]: SEED_NOTES },
      ensureNotes: (spaceId) => {
        if (get().notebooks[spaceId]) return;
        set((state) => ({
          notebooks: { ...state.notebooks, [spaceId]: [] },
        }));
      },
      removeNotes: (spaceId) => {
        set((state) => {
          const { [spaceId]: _removed, ...notebooks } = state.notebooks;
          return { notebooks };
        });
      },
      addNote: (spaceId, title, body, attachments = []) => {
        const id = createId();
        const now = Date.now();
        const note: Note = {
          id,
          title: title.trim(),
          body: body.trim(),
          attachments,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          notebooks: {
            ...state.notebooks,
            [spaceId]: [note, ...(state.notebooks[spaceId] ?? [])],
          },
        }));
        return id;
      },
      updateNote: (spaceId, id, title, body, attachments) => {
        set((state) => ({
          notebooks: {
            ...state.notebooks,
            [spaceId]: (state.notebooks[spaceId] ?? []).map((note) =>
              note.id === id
                ? {
                    ...note,
                    title: title.trim(),
                    body: body.trim(),
                    attachments: attachments ?? note.attachments ?? [],
                    updatedAt: Date.now(),
                  }
                : note,
            ),
          },
        }));
      },
      deleteNote: (spaceId, id) => {
        set((state) => ({
          notebooks: {
            ...state.notebooks,
            [spaceId]: (state.notebooks[spaceId] ?? []).filter((note) => note.id !== id),
          },
        }));
      },
      deleteMany: (spaceId, ids) => {
        const remove = new Set(ids);
        set((state) => ({
          notebooks: {
            ...state.notebooks,
            [spaceId]: (state.notebooks[spaceId] ?? []).filter((note) => !remove.has(note.id)),
          },
        }));
      },
    }),
    {
      name: "bacheca-notes-v1",
      storage: createJSONStorage(getStorage),
      skipHydration: true,
      partialize: (state) => ({ notebooks: state.notebooks }),
      version: 3,
      migrate: (persisted) => {
        const data = persisted as { notebooks?: Record<string, Note[]>; notes?: Note[] };
        const notebooks = data.notebooks
          ? data.notebooks
          : { [DEFAULT_NOTES_ID]: data.notes ?? [] };
        return {
          notebooks: Object.fromEntries(
            Object.entries(notebooks).map(([id, notes]) => [
              id,
              (notes ?? []).map((note) => ({
                ...note,
                attachments: note.attachments ?? [],
              })),
            ]),
          ),
        };
      },
    },
  ),
);

export function useNotesHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const finish = () => {
      if (active) setHydrated(true);
    };
    const unsub = useNotesStore.persist.onFinishHydration(finish);
    void Promise.resolve(useNotesStore.persist.rehydrate())
      .catch(() => undefined)
      .then(finish);
    if (useNotesStore.persist.hasHydrated()) finish();
    return () => {
      active = false;
      unsub?.();
    };
  }, []);

  return hydrated;
}

export function countAllNotes(notebooks: Record<string, Note[]>) {
  return Object.values(notebooks).reduce((sum, notes) => sum + notes.length, 0);
}
