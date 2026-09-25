import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { Deal, StageId } from "@/lib/sales-store";
import { STAGE_META } from "@/lib/sales-store";
import { Checkbox } from "@/components/motion/checkbox";
import { groupCheckState } from "@/lib/selection";
import { cn, formatEuro, pluralizeOfferte } from "@/lib/utils";
import { SortableDealCard } from "@/components/sales/deal-card";

const TONE: Record<StageId, string> = {
  lead: "bg-todo",
  offer: "bg-doing",
  won: "bg-done",
};

type DealColumnProps = {
  stageId: StageId;
  deals: Deal[];
  freshId: string | null;
  selectedIds: Set<string>;
  onAdd: () => void;
  onEdit: (dealId: string) => void;
  onDelete: (dealId: string) => void;
  onToggleSelect: (dealId: string) => void;
  onSelectColumn: (checked: boolean) => void;
  emptyLabel?: string;
};

export function DealColumn({
  stageId,
  deals,
  freshId,
  selectedIds,
  onAdd,
  onEdit,
  onDelete,
  onToggleSelect,
  onSelectColumn,
  emptyLabel = "Vuota",
}: DealColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });
  const meta = STAGE_META[stageId];
  const ids = deals.map((deal) => deal.id);
  const total = deals.reduce((sum, deal) => sum + deal.value, 0);
  const group = groupCheckState(ids, selectedIds);

  return (
    <section
      aria-labelledby={`stage-${stageId}`}
      className={cn(
        "flex h-full min-h-0 w-column shrink-0 snap-start flex-col rounded-3xl bg-surface p-2 md:w-auto md:min-w-0 md:flex-1",
        isOver && "ring-2 ring-ring/30",
      )}
    >
      <header className="flex items-center gap-2 px-2 py-2">
        <span
          className={cn("size-2 shrink-0 rounded-full", TONE[stageId])}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <h2
            id={`stage-${stageId}`}
            className="font-display text-sm font-medium tracking-[0.08em] text-foreground uppercase"
          >
            {meta.title}
          </h2>
          <p className="text-xs text-muted-foreground">
            {meta.hint} · {formatEuro(total)}
          </p>
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
            <span className="sr-only">{pluralizeOfferte(deals.length)}</span>
            <span aria-hidden="true">{deals.length}</span>
          </p>
        </div>
      </header>

      <div
        ref={setNodeRef}
        className="flex min-h-32 flex-1 flex-col gap-2 overflow-y-auto px-0.5 py-1"
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <SortableDealCard
              key={deal.id}
              deal={deal}
              fresh={freshId === deal.id}
              selected={selectedIds.has(deal.id)}
              onEdit={() => onEdit(deal.id)}
              onDelete={() => onDelete(deal.id)}
              onToggleSelect={() => onToggleSelect(deal.id)}
            />
          ))}
        </SortableContext>
        {deals.length === 0 ? (
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
        Aggiungi offerta
      </button>
    </section>
  );
}
