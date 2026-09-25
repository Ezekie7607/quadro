import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { Card, ColumnId } from "@/lib/board-store";
import { COLUMN_META } from "@/lib/board-store";
import { Checkbox } from "@/components/motion/checkbox";
import { groupCheckState } from "@/lib/selection";
import { cn, pluralizeSchede } from "@/lib/utils";
import { SortableKanbanCard } from "@/components/kanban/card";

const TONE: Record<ColumnId, string> = {
  todo: "bg-todo",
  doing: "bg-doing",
  done: "bg-done",
};

type KanbanColumnProps = {
  columnId: ColumnId;
  cards: Card[];
  freshId: string | null;
  selectedIds: Set<string>;
  onAdd: () => void;
  onEdit: (cardId: string) => void;
  onDelete: (cardId: string) => void;
  onToggleSelect: (cardId: string) => void;
  onSelectColumn: (checked: boolean) => void;
  emptyLabel?: string;
};

export function KanbanColumn({
  columnId,
  cards,
  freshId,
  selectedIds,
  onAdd,
  onEdit,
  onDelete,
  onToggleSelect,
  onSelectColumn,
  emptyLabel = "Vuota",
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  const meta = COLUMN_META[columnId];
  const ids = cards.map((card) => card.id);
  const group = groupCheckState(ids, selectedIds);

  return (
    <section
      aria-labelledby={`col-${columnId}`}
      className={cn(
        "flex h-full min-h-0 w-column shrink-0 snap-start flex-col rounded-3xl bg-surface p-2 md:w-auto md:min-w-0 md:flex-1",
        isOver && "ring-2 ring-ring/30",
      )}
    >
      <header className="flex items-center gap-2 px-2 py-2">
        <span
          className={cn("size-2 shrink-0 rounded-full", TONE[columnId])}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <h2
            id={`col-${columnId}`}
            className="font-display text-sm font-medium tracking-[0.08em] text-foreground uppercase"
          >
            {meta.title}
          </h2>
          <p className="text-xs text-muted-foreground">{meta.hint}</p>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={group.checked}
            indeterminate={group.indeterminate}
            disabled={group.disabled}
            onCheckedChange={onSelectColumn}
            aria-label={`Seleziona ${meta.title}`}
          />
          <p className="text-xs font-medium tabular-nums text-muted-foreground">
            <span className="sr-only">{pluralizeSchede(cards.length)}</span>
            <span aria-hidden="true">{cards.length}</span>
          </p>
        </div>
      </header>

      <div
        ref={setNodeRef}
        className="flex min-h-32 flex-1 flex-col gap-2 overflow-y-auto px-0.5 py-1"
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableKanbanCard
              key={card.id}
              card={card}
              fresh={freshId === card.id}
              selected={selectedIds.has(card.id)}
              onEdit={() => onEdit(card.id)}
              onDelete={() => onDelete(card.id)}
              onToggleSelect={() => onToggleSelect(card.id)}
            />
          ))}
        </SortableContext>
        {cards.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-3 font-display text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase transition-colors duration-quick hover:bg-foreground hover:text-background"
      >
        <Plus className="size-4" />
        Aggiungi scheda
      </button>
    </section>
  );
}
