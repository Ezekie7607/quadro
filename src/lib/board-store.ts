import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { arrayMove } from "@dnd-kit/sortable";
import { createId } from "@/lib/utils";
import { isIsoDate } from "@/lib/dates";
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
  moveCard: (
    spaceId: string,
    activeId: string,
    toColumn: ColumnId,
    overId: string | null,
  ) => void;
  moveMany: (spaceId: string, ids: string[], toColumn: ColumnId) => void;
  reorderInColumn: (
    spaceId: string,
    columnId: ColumnId,
    activeId: string,
    overId: string,
  ) => void;
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

export function findColumnOf(
  columns: Record<ColumnId, string[]>,
  cardId: string,
): ColumnId | null {
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

function normalizeBoard(data: Partial<BoardData> | undefined): BoardData {
  const cards: Record<string, Card> = {};
  for (const [id, card] of Object.entries(data?.cards ?? {})) {
    cards[id] = {
      ...card,
      priority: PRIORITY_IDS.includes(card.priority) ? card.priority : "med",
      dueDate: isIsoDate(card.dueDate) ? card.dueDate : null,
    };
  }
  return {
    cards,
    columns: {
      todo: [...(data?.columns?.todo ?? [])],
      doing: [...(data?.columns?.doing ?? [])],
      done: [...(data?.columns?.done ?? [])],
    },
  };
}

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
          title: title.trim(),
          description: description.trim(),
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
                    title: title.trim(),
                    description: description.trim(),
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
      storage: createJSONStorage(getStorage),
      skipHydration: true,
      partialize: (state) => ({ boards: state.boards }),
      version: 4,
      migrate: (persisted) => {
        const data = persisted as {
          boards?: Record<string, Partial<BoardData>>;
          cards?: Record<string, Card>;
          columns?: Record<ColumnId, string[]>;
        };
        if (data.boards) {
          const boards: Record<string, BoardData> = {};
          for (const [id, board] of Object.entries(data.boards)) {
            boards[id] = normalizeBoard(board);
          }
          return { boards };
        }
        return {
          boards: {
            [DEFAULT_BOARD_ID]: normalizeBoard({
              cards: data.cards,
              columns: data.columns,
            }),
          },
        };
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
