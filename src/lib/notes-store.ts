import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { quadroStorage } from "@/lib/safe-storage";
import { cleanText, cleanTimestamp, isRecord, isSafeId, safeEntries } from "@/lib/sanitize";
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

export const NOTE_TITLE_MAX = 120;
export const NOTE_BODY_MAX = 4000;
export const NOTE_FILES_MAX = 6;

const FILE_STATUSES = ["queued", "uploading", "success", "error"] as const;

function normalizeFile(raw: unknown, index: number): NoteFile | null {
  if (!isRecord(raw)) return null;
  const name = cleanText(raw.name, 200).trim();
  if (!name) return null;
  const status = FILE_STATUSES.find((item) => item === raw.status) ?? "error";
  // The progress bar is local to the dialog: a label saved mid-"upload" would
  // otherwise read "Caricamento" forever after a reload.
  const settled = status === "queued" || status === "uploading" ? "success" : status;
  const size = typeof raw.size === "number" && Number.isFinite(raw.size) ? raw.size : 0;
  return {
    id: isSafeId(raw.id) ? raw.id : `file-${index}`,
    name,
    size: Math.max(0, size),
    type: cleanText(raw.type, 120),
    progress: settled === "success" ? 100 : 0,
    status: settled,
  };
}

function normalizeNote(raw: unknown, index: number): Note | null {
  if (!isRecord(raw) || !isSafeId(raw.id)) return null;
  const createdAt = cleanTimestamp(raw.createdAt, index + 1);
  const files = Array.isArray(raw.attachments) ? raw.attachments : [];
  const seenFiles = new Set<string>();
  const attachments: NoteFile[] = [];
  files.forEach((file, fileIndex) => {
    const clean = normalizeFile(file, fileIndex);
    if (!clean || seenFiles.has(clean.id) || attachments.length >= NOTE_FILES_MAX) return;
    seenFiles.add(clean.id);
    attachments.push(clean);
  });
  return {
    id: raw.id,
    title: cleanText(raw.title, NOTE_TITLE_MAX).trim() || "Senza titolo",
    body: cleanText(raw.body, NOTE_BODY_MAX),
    attachments,
    createdAt,
    updatedAt: cleanTimestamp(raw.updatedAt, createdAt),
  };
}

/** Clean notebooks keyed by space id, or `null` when the input is not an object. */
export function normalizeNotebooks(raw: unknown): Record<string, Note[]> | null {
  if (!isRecord(raw)) return null;
  const notebooks: Record<string, Note[]> = {};
  for (const [spaceId, list] of safeEntries(raw)) {
    if (!isSafeId(spaceId)) continue;
    const seen = new Set<string>();
    const notes: Note[] = [];
    (Array.isArray(list) ? list : []).forEach((item, index) => {
      const note = normalizeNote(item, index);
      if (!note || seen.has(note.id)) return;
      seen.add(note.id);
      notes.push(note);
    });
    notebooks[spaceId] = notes;
  }
  return notebooks;
}

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
      storage: createJSONStorage(quadroStorage),
      skipHydration: true,
      partialize: (state) => ({ notebooks: state.notebooks }),
      version: 3,
      migrate: (persisted) => {
        const data = isRecord(persisted) ? persisted : {};
        // Before v2 there was a single notebook stored as `notes`.
        const notebooks =
          normalizeNotebooks(data.notebooks) ??
          normalizeNotebooks({ [DEFAULT_NOTES_ID]: data.notes }) ??
          {};
        return { notebooks };
      },
      merge: (persisted, current) => {
        const notebooks = normalizeNotebooks(isRecord(persisted) ? persisted.notebooks : undefined);
        return notebooks ? { ...current, notebooks } : current;
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
