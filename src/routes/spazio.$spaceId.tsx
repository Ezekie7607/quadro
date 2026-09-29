import { Link, createFileRoute } from "@tanstack/react-router";
import { Board } from "@/components/kanban/board";
import { NotesView } from "@/components/notes/notes-view";
import { SalesBoard } from "@/components/sales/sales-board";
import { useBoardStore } from "@/lib/board-store";
import { useNotesStore } from "@/lib/notes-store";
import { useSalesStore } from "@/lib/sales-store";
import { useSpacesStore } from "@/lib/spaces-store";
import { useEffect } from "react";

export const Route = createFileRoute("/spazio/$spaceId")({ component: SpacePage });

function SpacePage() {
  const { spaceId } = Route.useParams();
  const space = useSpacesStore((s) => s.spaces.find((item) => item.id === spaceId));

  useEffect(() => {
    if (!space) return;
    if (space.type === "board") useBoardStore.getState().ensureBoard(space.id);
    if (space.type === "sales") useSalesStore.getState().ensureSales(space.id);
    if (space.type === "notes") useNotesStore.getState().ensureNotes(space.id);
  }, [space]);

  if (!space) {
    return (
      <div className="flex h-full flex-col items-start justify-center gap-3 px-5">
        <p className="font-display text-3xl uppercase">Non c’è più</p>
        <p className="text-sm text-muted-foreground">Questo spazio è stato rimosso.</p>
        <Link to="/" className="font-display text-sm tracking-[0.12em] uppercase hover:underline">
          Home
        </Link>
      </div>
    );
  }

  // Keyed per space: two spaces of the same type must not share selection,
  // search, filters or an open dialog.
  if (space.type === "board") {
    return <Board key={space.id} spaceId={space.id} title={space.title} />;
  }
  if (space.type === "sales") {
    return <SalesBoard key={space.id} spaceId={space.id} title={space.title} />;
  }
  return <NotesView key={space.id} spaceId={space.id} title={space.title} />;
}
