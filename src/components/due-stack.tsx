import { DueChip } from "@/components/due-chip";
import {
  NotificationStack,
  type NotificationStackItem,
} from "@/components/motion/notification-stack";
import { formatDueLabel } from "@/lib/dates";

export type DueNotice = {
  id: string;
  title: string;
  dueDate: string;
  spaceId: string;
  spaceTitle: string;
};

export function DueStack({
  items,
  onViewAll,
  onItemSelect,
  collapsedLabel = "Scadenze",
  expandedLabel = "Apri",
  className,
}: {
  items: DueNotice[];
  onViewAll?: () => void;
  /** A tap on one due card of the open list. */
  onItemSelect?: (item: DueNotice) => void;
  collapsedLabel?: string;
  expandedLabel?: string;
  className?: string;
}) {
  const stackItems: NotificationStackItem[] = items.map((item) => ({
    id: `${item.spaceId}-${item.id}`,
    title: item.title,
    // The chip says how far; the line says which day and where.
    description: `${item.spaceTitle} · ${formatDueLabel(item.dueDate)}`,
    trailing: <DueChip iso={item.dueDate} />,
  }));

  return (
    <NotificationStack
      items={stackItems}
      onViewAll={onViewAll}
      onItemSelect={
        onItemSelect
          ? (stackId) => {
              const item = items.find((entry) => `${entry.spaceId}-${entry.id}` === stackId);
              if (item) onItemSelect(item);
            }
          : undefined
      }
      maxVisible={3}
      collapsedLabel={collapsedLabel}
      expandedLabel={expandedLabel}
      emptyLabel="Niente in scadenza"
      className={className}
    />
  );
}
