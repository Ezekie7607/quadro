import { useEffect, useRef } from "react";
import { useSettingsStore } from "@/lib/settings-store";
import { isShortcutBlocked } from "@/lib/shortcuts";
import { useUiStore } from "@/lib/ui-store";

/**
 * The page's single-key shortcuts (§12): N runs `onNew` when the page has one,
 * "/" focuses the page's own search and falls back to the palette. Both stand
 * down while typing, with a dialog open, or with "Scorciatoie" off.
 */
export function useQuietKeys({
  onNew,
  searchId = "quadro-search",
}: {
  onNew?: () => void;
  searchId?: string;
} = {}) {
  const shortcuts = useSettingsStore((s) => s.shortcuts);
  const onNewRef = useRef(onNew);

  useEffect(() => {
    onNewRef.current = onNew;
  });

  useEffect(() => {
    if (!shortcuts) return;
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isShortcutBlocked(event)) return;
      if ((event.key === "n" || event.key === "N") && onNewRef.current) {
        event.preventDefault();
        onNewRef.current();
        return;
      }
      if (event.key === "/") {
        event.preventDefault();
        const field = document.getElementById(searchId);
        if (field) {
          field.focus();
          return;
        }
        useUiStore.getState().setPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchId, shortcuts]);
}
