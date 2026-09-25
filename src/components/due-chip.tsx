import { dueTone, formatDueLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function DueChip({ iso, className }: { iso: string; className?: string }) {
  const tone = dueTone(iso);
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 font-display text-xs tracking-[0.08em] uppercase",
        tone === "overdue" && "bg-foreground text-background",
        tone === "today" && "bg-accent text-foreground",
        tone === "later" && "bg-muted text-muted-foreground",
        className,
      )}
    >
      {formatDueLabel(iso)}
    </span>
  );
}
