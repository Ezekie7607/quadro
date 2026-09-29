import { normalizeBoards, useBoardStore } from "@/lib/board-store";
import { normalizeNotebooks, useNotesStore } from "@/lib/notes-store";
import { normalizePipelines, useSalesStore } from "@/lib/sales-store";
import { isRecord } from "@/lib/sanitize";
import {
  SETTINGS_STORAGE_KEY,
  clampSettings,
  pickSettings,
  useSettingsStore,
  type AppSettings,
} from "@/lib/settings-store";
import { normalizeSpaces, useSpacesStore, type Space } from "@/lib/spaces-store";
import type { BoardData } from "@/lib/board-store";
import type { Note } from "@/lib/notes-store";
import type { PipelineData } from "@/lib/sales-store";

const KEYS = [
  "quadro-spaces-v1",
  "bacheca-v1",
  "bacheca-notes-v1",
  "bacheca-sales-v1",
  SETTINGS_STORAGE_KEY,
  "quadro-cal-view",
] as const;

/**
 * A cap before reading, since a huge file is what froze the page. localStorage
 * holds about 5 MB per site, but the export is indented and runs about 1.3x
 * the stored size, so the cap leaves room above that; `applyBackup` rolls back
 * if the browser still refuses the data.
 */
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

type BackupFile = {
  version: 1;
  app: "quadro";
  exportedAt: string;
  spaces: Space[];
  boards: Record<string, BoardData>;
  notebooks: Record<string, Note[]>;
  pipelines: Record<string, PipelineData>;
  settings: AppSettings;
};

/** A backup that passed every check and is ready to be written. */
export type CheckedBackup = {
  spaces: Space[];
  boards: Record<string, BoardData>;
  notebooks: Record<string, Note[]>;
  pipelines: Record<string, PipelineData>;
  settings: AppSettings;
  exportedAt: string | null;
  counts: { spaces: number; cards: number; deals: number; notes: number };
};

/** An import that cannot go ahead, with the line to show the user. */
export class BackupError extends Error {}

export function exportQuadro() {
  const payload: BackupFile = {
    version: 1,
    app: "quadro",
    exportedAt: new Date().toISOString(),
    spaces: useSpacesStore.getState().spaces,
    boards: useBoardStore.getState().boards,
    notebooks: useNotesStore.getState().notebooks,
    pipelines: useSalesStore.getState().pipelines,
    settings: pickSettings(useSettingsStore.getState()),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `quadro-${localDateStamp()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** YYYY-MM-DD in the local calendar: just after midnight in Rome, UTC is still yesterday. */
function localDateStamp(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Keep only the collections that belong to a space of the matching type. */
function pickFor<T>(spaces: Space[], type: Space["type"], source: Record<string, T>) {
  const out: Record<string, T> = {};
  for (const space of spaces) {
    if (space.type === type && Object.hasOwn(source, space.id)) out[space.id] = source[space.id];
  }
  return out;
}

/**
 * Read and check a backup file without touching the current data. Throws a
 * `BackupError` with a short Italian message when the file cannot be used.
 */
export async function readBackup(file: File): Promise<CheckedBackup> {
  if (file.size > MAX_BACKUP_BYTES) {
    throw new BackupError("File troppo grande: il massimo è 10 MB.");
  }
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new BackupError("File non valido: non è un JSON.");
  }
  if (!isRecord(data) || data.app !== "quadro" || data.version !== 1) {
    throw new BackupError("File non riconosciuto: serve una copia esportata da Quadro.");
  }
  const spaces = normalizeSpaces(data.spaces);
  const boards = normalizeBoards(data.boards ?? {});
  const notebooks = normalizeNotebooks(data.notebooks ?? {});
  const pipelines = normalizePipelines(data.pipelines ?? {});
  if (!spaces || !boards || !notebooks || !pipelines) {
    throw new BackupError("File danneggiato: mancano gli spazi o i loro dati.");
  }
  const kept = {
    boards: pickFor(spaces, "board", boards),
    notebooks: pickFor(spaces, "notes", notebooks),
    pipelines: pickFor(spaces, "sales", pipelines),
  };
  return {
    spaces,
    ...kept,
    settings: clampSettings(data.settings),
    exportedAt: typeof data.exportedAt === "string" ? data.exportedAt : null,
    counts: {
      spaces: spaces.length,
      cards: Object.values(kept.boards).reduce((sum, b) => sum + Object.keys(b.cards).length, 0),
      deals: Object.values(kept.pipelines).reduce((sum, p) => sum + Object.keys(p.deals).length, 0),
      notes: Object.values(kept.notebooks).reduce((sum, list) => sum + list.length, 0),
    },
  };
}

/**
 * Replace everything with a checked backup, then reload. All five keys are
 * written or none: if the browser refuses one (quota, private mode), the
 * previous values are put back before the error reaches the caller.
 */
export function applyBackup(backup: CheckedBackup) {
  const entries: [string, string][] = [
    ["quadro-spaces-v1", JSON.stringify({ state: { spaces: backup.spaces }, version: 1 })],
    ["bacheca-v1", JSON.stringify({ state: { boards: backup.boards }, version: 4 })],
    ["bacheca-notes-v1", JSON.stringify({ state: { notebooks: backup.notebooks }, version: 3 })],
    ["bacheca-sales-v1", JSON.stringify({ state: { pipelines: backup.pipelines }, version: 2 })],
    [SETTINGS_STORAGE_KEY, JSON.stringify({ state: backup.settings, version: 1 })],
  ];
  const previous = entries.map(([key]) => [key, localStorage.getItem(key)] as const);
  try {
    for (const [key, value] of entries) localStorage.setItem(key, value);
  } catch {
    for (const [key, value] of previous) {
      try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch {
        // Restoring an old value cannot exceed the space it already had.
      }
    }
    throw new BackupError("Il browser non ha spazio per questa copia. Niente è cambiato.");
  }
  window.location.reload();
}

export function resetQuadro() {
  for (const key of KEYS) localStorage.removeItem(key);
  window.location.reload();
}
