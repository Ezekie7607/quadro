import { useBoardStore } from "@/lib/board-store";
import { useNotesStore } from "@/lib/notes-store";
import { useSalesStore } from "@/lib/sales-store";
import { SETTINGS_STORAGE_KEY, useSettingsStore } from "@/lib/settings-store";
import { useSpacesStore } from "@/lib/spaces-store";

const KEYS = [
  "quadro-spaces-v1",
  "bacheca-v1",
  "bacheca-notes-v1",
  "bacheca-sales-v1",
  SETTINGS_STORAGE_KEY,
  "quadro-cal-view",
] as const;

type BackupFile = {
  version: 1;
  app: "quadro";
  exportedAt: string;
  spaces: unknown;
  boards: unknown;
  notebooks: unknown;
  pipelines: unknown;
  settings: unknown;
};

export function exportQuadro() {
  const payload: BackupFile = {
    version: 1,
    app: "quadro",
    exportedAt: new Date().toISOString(),
    spaces: useSpacesStore.getState().spaces,
    boards: useBoardStore.getState().boards,
    notebooks: useNotesStore.getState().notebooks,
    pipelines: useSalesStore.getState().pipelines,
    settings: useSettingsStore.getState(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const stamp = payload.exportedAt.slice(0, 10);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `quadro-${stamp}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importQuadro(file: File) {
  const text = await file.text();
  const data = JSON.parse(text) as Partial<BackupFile>;
  if (data.app !== "quadro" || data.version !== 1) {
    throw new Error("File non riconosciuto");
  }
  localStorage.setItem(
    "quadro-spaces-v1",
    JSON.stringify({ state: { spaces: data.spaces ?? [] }, version: 1 }),
  );
  localStorage.setItem(
    "bacheca-v1",
    JSON.stringify({ state: { boards: data.boards ?? {} }, version: 4 }),
  );
  localStorage.setItem(
    "bacheca-notes-v1",
    JSON.stringify({ state: { notebooks: data.notebooks ?? {} }, version: 3 }),
  );
  localStorage.setItem(
    "bacheca-sales-v1",
    JSON.stringify({ state: { pipelines: data.pipelines ?? {} }, version: 2 }),
  );
  localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({ state: data.settings ?? {}, version: 1 }),
  );
  window.location.reload();
}

export function resetQuadro() {
  for (const key of KEYS) localStorage.removeItem(key);
  window.location.reload();
}
