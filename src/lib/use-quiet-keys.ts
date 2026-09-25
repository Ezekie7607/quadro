import { useEffect } from "react";
import { useSettingsStore } from "@/lib/settings-store";
import { useUiStore } from "@/lib/ui-store";

export function useQuietKeys({
  onNew,
  searchId = "quadro-search",
}: {
  onNew: () => void;
  searchId?: string;
}) {
  const shortcuts = useSettingsStore((s) => s.shortcuts);

  useEffect(() => {
    if (!shortcuts) return;
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (typing) return;
      if (
        document.querySelector(
          '[data-slot="dialog-content"], [data-slot="alert-dialog-content"], [data-slot="command-palette"]',
        )
      ) {
        return;
      }
      if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        onNew();
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
  }, [onNew, searchId, shortcuts]);
}