import { dueTone, formatDayLong, formatDueRelative } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** Past due reads red, today reads soft, anything later reads plain. */
export function DueChip({ iso, className }: { iso: string; className?: string }) {
  const tone = dueTone(iso);
  return (
    <span
      title={formatDayLong(iso)}
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 font-display text-xs tracking-[0.08em] whitespace-nowrap uppercase",
        tone === "overdue" && "border-transparent bg-destructive text-destructive-foreground",
        tone === "today" && "border-transparent bg-muted text-foreground",
        tone === "later" && "border-border text-foreground",
        className,
      )}
    >
      {formatDueRelative(iso)}
    </span>
  );
}
