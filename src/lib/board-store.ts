import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { quadroStorage } from "@/lib/safe-storage";
import { arrayMove } from "@dnd-kit/sortable";
import { createId } from "@/lib/utils";
import { isIsoDate } from "@/lib/dates";
import {
  claimIds,
  cleanText,
  cleanTimestamp,
  isRecord,
  isSafeId,
  safeEntries,
} from "@/lib/sanitize";
import { DEFAULT_BOARD_ID } from "@/lib/spaces-store";
import { boardFromKit, type BoardKit } from "@/lib/board-kits";
import { useEffect, useState } from "react";

export const COLUMN_IDS = ["todo", "doing", "done"] as const;
export type ColumnId = (typeof COLUMN_IDS)[number];

export const PRIORITY_IDS = ["low", "med", "high"] as const;
export type PriorityId = (typeof PRIORITY_IDS)[number];

export type Card = {
  id: string;
  title: string;
  description: string;
  priority: PriorityId;
  dueDate: string | null;
  createdAt: number;
};

export const COLUMN_META: Record<ColumnId, { title: string; hint: string }> = {
  todo: { title: "Da fare", hint: "In attesa" },
  doing: { title: "In corso", hint: "In lavorazione" },
  done: { title: "Completato", hint: "Fatto" },
};

export const PRIORITY_META: Record<PriorityId, { title: string }> = {
  low: { title: "Bassa" },
  med: { title: "Media" },
  high: { title: "Alta" },
};

const SEED_CARDS: Record<string, Card> = {
  "seed-1": {
    id: "seed-1",
    title: "Scrivere il brief per settembre",
    description: "Obiettivi, tono di voce e tre riferimenti visivi da condividere con il team.",
    priority: "high",
    dueDate: "2026-09-17",
    createdAt: 1,
  },
  "seed-2": {
    id: "seed-2",
    title: "Richiedere preventivo fornitori",
    description: "Due opzioni per stampa e allestimento, con tempi di consegna.",
    priority: "med",
    dueDate: "2026-09-25",
    createdAt: 2,
  },
  "seed-3": {
    id: "seed-3",
    title: "Aggiornare le foto prodotto",
    description: "Sostituire gli scatti vecchi in homepage e in catalogo.",
    priority: "med",
    dueDate: "2026-10-03",
    createdAt: 3,
  },
  "seed-4": {
    id: "seed-4",
    title: "Definire le tre colonne",
    description: "Da fare, In corso e Completato — flusso semplice, niente di più.",
    priority: "low",
    dueDate: null,
    createdAt: 4,
  },
};

const SEED_COLUMNS: Record<ColumnId, string[]> = {
  todo: ["seed-1", "seed-2"],
  doing: ["seed-3"],
  done: ["seed-4"],
};

export type BoardData = {
  cards: Record<string, Card>;
  columns: Record<ColumnId, string[]>;
};

type BoardState = {
  boards: Record<string, BoardData>;
  ensureBoard: (spaceId: string, kit?: BoardKit) => void;
  removeBoard: (spaceId: string) => void;
  addCard: (
    spaceId: string,
    columnId: ColumnId,
    title: string,
    description: string,
    priority?: PriorityId,
    dueDate?: string | null,
  ) => string;
  updateCard: (
    spaceId: string,
    id: string,
    title: string,
    description: string,
    priority: PriorityId,
    dueDate: string | null,
  ) => void;
  deleteCard: (spaceId: string, id: string) => void;
  deleteMany: (spaceId: string, ids: string[]) => void;
  moveCard: (spaceId: string, activeId: string, toColumn: ColumnId, overId: string | null) => void;
  moveMany: (spaceId: string, ids: string[], toColumn: ColumnId) => void;
  reorderInColumn: (spaceId: string, columnId: ColumnId, activeId: string, overId: string) => void;
  /** Put back a column layout taken earlier, e.g. when a drag is cancelled. */
  setColumns: (spaceId: string, columns: BoardData["columns"]) => void;
};

export const EMPTY_BOARD: BoardData = {
  cards: {},
  columns: { todo: [], doing: [], done: [] },
};

export function emptyBoard(): BoardData {
  return { cards: {}, columns: { todo: [], doing: [], done: [] } };
}

export function isColumnId(value: string): value is ColumnId {
  return (COLUMN_IDS as readonly string[]).includes(value);
}

export function findColumnOf(columns: Record<ColumnId, string[]>, cardId: string): ColumnId | null {
  for (const id of COLUMN_IDS) {
    if (columns[id].includes(cardId)) return id;
  }
  return null;
}

function cloneColumns(columns: Record<ColumnId, string[]>) {
  return {
    todo: [...columns.todo],
    doing: [...columns.doing],
    done: [...columns.done],
  };
}

export const CARD_TITLE_MAX = 120;
export const CARD_TEXT_MAX = 1000;

function isPriorityId(value: unknown): value is PriorityId {
  return typeof value === "string" && (PRIORITY_IDS as readonly string[]).includes(value);
}

/**
 * A board that every view can read without guarding: known fields only, text
 * capped, each card in exactly one column, and no card left outside a column
 * (an orphan would be counted nowhere and shown nowhere).
 */
function normalizeBoard(data: unknown): BoardData {
  const source = isRecord(data) ? data : {};
  const cards: Record<string, Card> = {};
  safeEntries(source.cards).forEach(([key, raw], index) => {
    if (!isSafeId(key) || !isRecord(raw)) return;
    cards[key] = {
      id: key,
      title: cleanText(raw.title, CARD_TITLE_MAX).trim() || "Senza titolo",
      description: cleanText(raw.description, CARD_TEXT_MAX),
      priority: isPriorityId(raw.priority) ? raw.priority : "med",
      dueDate: isIsoDate(raw.dueDate) ? raw.dueDate : null,
      createdAt: cleanTimestamp(raw.createdAt, index + 1),
    };
  });
  const known = new Set(Object.keys(cards));
  const claimed = new Set<string>();
  const rawColumns = isRecord(source.columns) ? source.columns : {};
  const columns = {
    todo: claimIds(rawColumns.todo, known, claimed),
    doing: claimIds(rawColumns.doing, known, claimed),
    done: claimIds(rawColumns.done, known, claimed),
  };
  for (const id of known) {
    if (!claimed.has(id)) columns.todo.push(id);
  }
  return { cards, columns };
}

/** Clean boards keyed by space id, or `null` when the input is not an object. */
export function normalizeBoards(raw: unknown): Record<string, BoardData> | null {
  if (!isRecord(raw)) return null;
  const boards: Record<string, BoardData> = {};
  for (const [spaceId, board] of safeEntries(raw)) {
    if (!isSafeId(spaceId)) continue;
    boards[spaceId] = normalizeBoard(board);
  }
  return boards;
}

function readBoard(state: BoardState, spaceId: string): BoardData {
  return state.boards[spaceId] ?? EMPTY_BOARD;
}

export const useBoardStore = create<BoardState>()(
  persist(
    (set, get) => ({
      boards: {
        [DEFAULT_BOARD_ID]: { cards: SEED_CARDS, columns: SEED_COLUMNS },
      },
      ensureBoard: (spaceId, kit = "blank") => {
        if (get().boards[spaceId]) return;
        set((state) => ({
          boards: { ...state.boards, [spaceId]: boardFromKit(kit) },
        }));
      },
      removeBoard: (spaceId) => {
        set((state) => {
          const { [spaceId]: _removed, ...boards } = state.boards;
          return { boards };
        });
      },
      addCard: (spaceId, columnId, title, description, priority = "med", dueDate = null) => {
        const id = createId();
        const card: Card = {
          id,
          title: title.trim().slice(0, CARD_TITLE_MAX),
          description: description.trim().slice(0, CARD_TEXT_MAX),
          priority,
          dueDate: isIsoDate(dueDate) ? dueDate : null,
          createdAt: Date.now(),
        };
        set((state) => {
          const board = readBoard(state, spaceId);
          return {
            boards: {
              ...state.boards,
              [spaceId]: {
                cards: { ...board.cards, [id]: card },
                columns: {
                  ...board.columns,
                  [columnId]: [...board.columns[columnId], id],
                },
              },
            },
          };
        });
        return id;
      },
      updateCard: (spaceId, id, title, description, priority, dueDate) => {
        set((state) => {
          const board = readBoard(state, spaceId);
          const existing = board.cards[id];
          if (!existing) return state;
          return {
            boards: {
              ...state.boards,
              [spaceId]: {
                ...board,
                cards: {
                  ...board.cards,
                  [id]: {
                    ...existing,
                    title: title.trim().slice(0, CARD_TITLE_MAX),
                    description: description.trim().slice(0, CARD_TEXT_MAX),
                    priority,
                    dueDate: isIsoDate(dueDate) ? dueDate : null,
                  },
                },
              },
            },
          };
        });
      },
      deleteCard: (spaceId, id) => {
        set((state) => {
          const board = readBoard(state, spaceId);
          const columnId = findColumnOf(board.columns, id);
          const { [id]: _removed, ...cards } = board.cards;
          if (!columnId) {
            return { boards: { ...state.boards, [spaceId]: { ...board, cards } } };
          }
          return {
            boards: {
              ...state.boards,
              [spaceId]: {
                cards,
                columns: {
                  ...board.columns,
                  [columnId]: board.columns[columnId].filter((cardId) => cardId !== id),
                },
              },
            },
          };
        });
      },
      deleteMany: (spaceId, ids) => {
        set((state) => {
          const board = readBoard(state, spaceId);
          const remove = new Set(ids);
          const cards = { ...board.cards };
          for (const id of remove) delete cards[id];
          return {
            boards: {
              ...state.boards,
              [spaceId]: {
                cards,
                columns: {
                  todo: board.columns.todo.filter((id) => !remove.has(id)),
                  doing: board.columns.doing.filter((id) => !remove.has(id)),
                  done: board.columns.done.filter((id) => !remove.has(id)),
                },
              },
            },
          };
        });
      },
      moveCard: (spaceId, activeId, toColumn, overId) => {
        set((state) => {
          const board = readBoard(state, spaceId);
          const fromColumn = findColumnOf(board.columns, activeId);
          if (!fromColumn) return state;
          const columns = cloneColumns(board.columns);
          columns[fromColumn] = columns[fromColumn].filter((id) => id !== activeId);
          const target = columns[toColumn];
          let insertIndex = target.length;
          if (overId && overId !== toColumn) {
            const idx = target.indexOf(overId);
            if (idx >= 0) insertIndex = idx;
          }
          target.splice(insertIndex, 0, activeId);
          return {
            boards: { ...state.boards, [spaceId]: { ...board, columns } },
          };
        });
      },
      moveMany: (spaceId, ids, toColumn) => {
        set((state) => {
          const board = readBoard(state, spaceId);
          const unique = ids.filter((id) => board.cards[id]);
          if (unique.length === 0) return state;
          const moving = new Set(unique);
          const columns = cloneColumns(board.columns);
          for (const columnId of COLUMN_IDS) {
            columns[columnId] = columns[columnId].filter((id) => !moving.has(id));
          }
          columns[toColumn] = [...columns[toColumn], ...unique];
          return {
            boards: { ...state.boards, [spaceId]: { ...board, columns } },
          };
        });
      },
      setColumns: (spaceId, columns) => {
        set((state) => {
          const board = state.boards[spaceId];
          if (!board) return state;
          // Reconcile, do not replace: another tab may have added or deleted
          // cards since the layout was taken.
          const known = new Set(Object.keys(board.cards));
          const claimed = new Set<string>();
          const next = {
            todo: claimIds(columns.todo, known, claimed),
            doing: claimIds(columns.doing, known, claimed),
            done: claimIds(columns.done, known, claimed),
          };
          for (const id of known) if (!claimed.has(id)) next.todo.push(id);
          return { boards: { ...state.boards, [spaceId]: { ...board, columns: next } } };
        });
      },
      reorderInColumn: (spaceId, columnId, activeId, overId) => {
        set((state) => {
          const board = readBoard(state, spaceId);
          const list = board.columns[columnId];
          const oldIndex = list.indexOf(activeId);
          const newIndex = list.indexOf(overId);
          if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return state;
          return {
            boards: {
              ...state.boards,
              [spaceId]: {
                ...board,
                columns: {
                  ...board.columns,
                  [columnId]: arrayMove(list, oldIndex, newIndex),
                },
              },
            },
          };
        });
      },
    }),
    {
      name: "bacheca-v1",
      storage: createJSONStorage(quadroStorage),
      skipHydration: true,
      partialize: (state) => ({ boards: state.boards }),
      version: 4,
      migrate: (persisted) => {
        const data = isRecord(persisted) ? persisted : {};
        const boards = normalizeBoards(data.boards);
        if (boards) return { boards };
        // Before v2 there was a single board stored at the top level.
        return {
          boards: {
            [DEFAULT_BOARD_ID]: normalizeBoard({ cards: data.cards, columns: data.columns }),
          },
        };
      },
      merge: (persisted, current) => {
        const boards = normalizeBoards(isRecord(persisted) ? persisted.boards : undefined);
        return boards ? { ...current, boards } : current;
      },
    },
  ),
);

export function useBoardHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const finish = () => {
      if (active) setHydrated(true);
    };
    const unsub = useBoardStore.persist.onFinishHydration(finish);
    void Promise.resolve(useBoardStore.persist.rehydrate())
      .catch(() => undefined)
      .then(finish);
    if (useBoardStore.persist.hasHydrated()) finish();
    return () => {
      active = false;
      unsub?.();
    };
  }, []);

  return hydrated;
}

export function getBoardData(spaceId: string): BoardData {
  return useBoardStore.getState().boards[spaceId] ?? EMPTY_BOARD;
}

export function countBoard(board: BoardData) {
  return COLUMN_IDS.reduce((sum, id) => sum + board.columns[id].length, 0);
}

export function countAllBoards(boards: Record<string, BoardData>) {
  return Object.values(boards).reduce((sum, board) => sum + countBoard(board), 0);
}
