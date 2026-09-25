import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import type { HTMLAttributes } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import type { Card } from "@/lib/board-store";
import { PRIORITY_META } from "@/lib/board-store";
import { cn } from "@/lib/utils";
import { DueChip } from "@/components/due-chip";
import { Checkbox } from "@/components/motion/checkbox";
import { Tooltip } from "@/components/motion/tooltip";

type CardViewProps = {
  card: Card;
  overlay?: boolean;
  fresh?: boolean;
  dragging?: boolean;
  selected?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleSelect?: () => void;
  listeners?: DraggableSyntheticListeners;
  attributes?: HTMLAttributes<HTMLElement>;
};

export function KanbanCardView({
  card,
  overlay = false,
  fresh = false,
  dragging = false,
  selected = false,
  onEdit,
  onDelete,
  onToggleSelect,
  listeners,
  attributes,
}: CardViewProps) {
  return (
    <article
      className={cn(
        "kanban-card group rounded-lg bg-card p-3 text-card-foreground",
        overlay && "kanban-card-overlay",
        fresh && "card-enter",
        dragging && "is-dragging",
        selected && "is-selected",
      )}
    >
      <div className="flex items-start gap-1">
        {onToggleSelect ? (
          <Checkbox
            checked={selected}
            aria-label={selected ? `Deseleziona ${card.title}` : `Seleziona ${card.title}`}
            onCheckedChange={() => onToggleSelect()}
            className="mt-1.5 size-8 justify-center"
          />
        ) : null}
        <Tooltip content="Trascina" side="top">
          <button
            type="button"
            className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-quick hover:bg-accent hover:text-foreground touch-none"
            aria-label="Trascina scheda"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        </Tooltip>
        <button
          type="button"
          onClick={onEdit}
          className="min-w-0 flex-1 rounded-md px-1 py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <h3 className="text-sm font-medium leading-snug text-foreground">
            {card.title}
          </h3>
          {card.description ? (
            <p className="mt-1 line-clamp-3 text-sm leading-normal text-muted-foreground">
              {card.description}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <p
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 font-display text-xs tracking-[0.12em] uppercase",
                card.priority === "high" && "bg-foreground text-background",
                card.priority === "med" && "bg-accent text-foreground",
                card.priority === "low" && "bg-muted text-muted-foreground",
              )}
            >
              {PRIORITY_META[card.priority ?? "med"].title}
            </p>
            {card.dueDate ? <DueChip iso={card.dueDate} /> : null}
          </div>
        </button>
        {onDelete ? (
          <Tooltip content="Elimina" side="left">
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Elimina ${card.title}`}
              className="relative mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-quick hover:bg-destructive/10 hover:text-destructive focus-visible:text-destructive focus-visible:ring-2 focus-visible:ring-ring/40 after:absolute after:top-1/2 after:left-1/2 after:size-11 after:-translate-x-1/2 after:-translate-y-1/2 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
            >
              <Trash2 className="size-4" />
            </button>
          </Tooltip>
        ) : (
          <span className="size-8 shrink-0" aria-hidden="true" />
        )}
      </div>
    </article>
  );
}

type SortableCardProps = {
  card: Card;
  fresh?: boolean;
  selected?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleSelect: () => void;
};

export function SortableKanbanCard({
  card,
  fresh,
  selected,
  onEdit,
  onDelete,
  onToggleSelect,
}: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <KanbanCardView
        card={card}
        fresh={fresh && !isDragging}
        dragging={isDragging}
        selected={selected}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleSelect={onToggleSelect}
        listeners={listeners}
        attributes={attributes}
      />
    </div>
  );
}
