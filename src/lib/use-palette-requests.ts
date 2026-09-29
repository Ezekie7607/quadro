import { useEffect, useRef } from "react";
import { useUiStore, type OpenTarget } from "@/lib/ui-store";

/**
 * Take the palette's requests meant for this space: a queued "Nuova …"
 * (`onCreate`) or a search result to open (`onOpen` with its id). The request
 * counter re-runs the check, so asking for the same thing twice still works.
 */
export function usePaletteRequests({
  kind,
  spaceId,
  onCreate,
  onOpen,
}: {
  kind: OpenTarget["kind"];
  spaceId: string;
  onCreate: () => void;
  onOpen: (id: string) => void;
}) {
  const seq = useUiStore((s) => s.pendingSeq);
  const handlers = useRef({ onCreate, onOpen });

  useEffect(() => {
    handlers.current = { onCreate, onOpen };
  });

  useEffect(() => {
    const ui = useUiStore.getState();
    if (ui.consumeCreate(kind, spaceId)) handlers.current.onCreate();
    const id = ui.consumeOpen(kind, spaceId);
    if (id) handlers.current.onOpen(id);
  }, [kind, seq, spaceId]);
}
