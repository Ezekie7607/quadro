import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, pluralizeSelected } from "@/lib/utils";

type MoveOption = { id: string; label: string };

export function SelectionBar({
  count,
  moveOptions,
  onMove,
  onDelete,
  onClear,
}: {
  count: number;
  moveOptions?: MoveOption[];
  onMove?: (id: string) => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Azioni selezione"
      className="sticky bottom-3 z-20 mt-2 flex flex-wrap items-center gap-2 rounded-3xl bg-foreground px-4 py-2.5 text-background shadow-lift"
    >
      <p className="font-display text-xs tracking-[0.12em] uppercase">
        {pluralizeSelected(count)}
      </p>
      {moveOptions && onMove ? (
        <div className="flex flex-wrap gap-1">
          {moveOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onMove(option.id)}
              className={cn(
                "h-9 rounded-full bg-background/15 px-3 font-display text-xs tracking-wide uppercase",
                "hover:bg-background hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onDelete}
          className="rounded-full font-display tracking-[0.12em] uppercase"
        >
          Elimina
        </Button>
        <button
          type="button"
          onClick={onClear}
          aria-label="Annulla selezione"
          className="inline-flex size-11 items-center justify-center rounded-full hover:bg-background/15"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
