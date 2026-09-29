import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import type { HTMLAttributes } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import type { Deal } from "@/lib/sales-store";
import { cn, formatEuro } from "@/lib/utils";
import { Checkbox } from "@/components/motion/checkbox";

type DealViewProps = {
  deal: Deal;
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

export function DealCardView({
  deal,
  overlay = false,
  fresh = false,
  dragging = false,
  selected = false,
  onEdit,
  onDelete,
  onToggleSelect,
  listeners,
  attributes,
}: DealViewProps) {
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
      {/* Select, drag and delete share one narrow rail so the text keeps the
          width of the column, which is about 225px at 1024 with the menu open. */}
      <div className="flex items-start gap-1">
        <div className="flex shrink-0 flex-col items-center">
          {onToggleSelect ? (
            <Checkbox
              checked={selected}
              aria-label={selected ? `Deseleziona ${deal.title}` : `Seleziona ${deal.title}`}
              onCheckedChange={() => onToggleSelect()}
              className="size-8 justify-center"
            />
          ) : null}
          <button
            type="button"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-quick hover:bg-accent hover:text-foreground touch-none"
            aria-label="Trascina offerta"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Elimina ${deal.title}`}
              className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-quick hover:bg-destructive/10 hover:text-destructive focus-visible:text-destructive focus-visible:ring-2 focus-visible:ring-ring/40 after:absolute after:top-1/2 after:left-1/2 after:size-11 after:-translate-x-1/2 after:-translate-y-1/2 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
            >
              <Trash2 className="size-4" />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="min-w-0 flex-1 rounded-md px-1 py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <h3 className="text-sm font-medium leading-snug text-foreground">{deal.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{deal.client || "Senza cliente"}</p>
          <p className="mt-2 font-display text-lg leading-none tracking-tight text-foreground">
            {formatEuro(deal.value)}
          </p>
          {deal.notes ? (
            <p className="mt-1 line-clamp-2 text-sm leading-normal text-muted-foreground">
              {deal.notes}
            </p>
          ) : null}
        </button>
      </div>
    </article>
  );
}

export function SortableDealCard({
  deal,
  fresh,
  selected,
  onEdit,
  onDelete,
  onToggleSelect,
}: {
  deal: Deal;
  fresh?: boolean;
  selected?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <DealCardView
        deal={deal}
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
