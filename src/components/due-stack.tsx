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
  collapsedLabel = "Scadenze",
  expandedLabel = "Apri",
  className,
}: {
  items: DueNotice[];
  onViewAll?: () => void;
  collapsedLabel?: string;
  expandedLabel?: string;
  className?: string;
}) {
  const stackItems: NotificationStackItem[] = items.map((item) => ({
    id: `${item.spaceId}-${item.id}`,
    title: item.title,
    description: `${item.spaceTitle} · ${formatDueLabel(item.dueDate)}`,
    trailing: <DueChip iso={item.dueDate} />,
  }));

  return (
    <NotificationStack
      items={stackItems}
      onViewAll={onViewAll}
      maxVisible={3}
      collapsedLabel={collapsedLabel}
      expandedLabel={expandedLabel}
      emptyLabel="Niente in scadenza"
      className={className}
    />
  );
}
