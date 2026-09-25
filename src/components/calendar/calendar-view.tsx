import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, ChevronLeft, ChevronRight, Columns3, LayoutGrid, List } from "lucide-react";
import { ActionSwapBlurButton } from "@/components/motion/action-swap-blur";
import { ActionSwapCascadeText } from "@/components/motion/action-swap-cascade";
import { ActionSwapRollButton } from "@/components/motion/action-swap-roll";
import { DueChip } from "@/components/due-chip";
import { SplitHeadline } from "@/components/split-headline";
import { Tooltip } from "@/components/motion/tooltip";
import { COLUMN_META, findColumnOf, useBoardStore, type Card } from "@/lib/board-store";
import {
  addDays,
  formatDayHeading,
  formatMonthYear,
  monthCells,
  startOfMonth,
  toIsoDate,
  todayIso,
  weekDays,
  weekdayStrip,
} from "@/lib/dates";
import { useSettingsStore } from "@/lib/settings-store";
import { useSpacesStore } from "@/lib/spaces-store";
import { cn } from "@/lib/utils";

type CalView = "month" | "week" | "agenda";

const VIEW_ITEMS = [
  { id: "month" as const, label: "Mese", icon: <LayoutGrid className="h-4 w-4" />, ariaLabel: "Vista mese" },
  { id: "week" as const, label: "Settimana", icon: <Columns3 className="h-4 w-4" />, ariaLabel: "Vista settimana" },
  { id: "agenda" as const, label: "Agenda", icon: <List className="h-4 w-4" />, ariaLabel: "Vista agenda" },
];

type CalEvent = {
  id: string;
  title: string;
  dueDate: string;
  spaceId: string;
  spaceTitle: string;
  columnTitle: string;
};

function readView(): CalView {
  if (typeof window === "undefined") return "month";
  const fromSettings = useSettingsStore.getState().defaultCalView;
  if (fromSettings === "week" || fromSettings === "agenda" || fromSettings === "month") {
    return fromSettings;
  }
  const raw = window.localStorage.getItem("quadro-cal-view");
  return raw === "week" || raw === "agenda" || raw === "month" ? raw : "month";
}

export function CalendarView() {
  const boards = useBoardStore((s) => s.boards);
  const spaces = useSpacesStore((s) => s.spaces);
  const weekStart = useSettingsStore((s) => s.weekStart);
  const weekStartsOn = weekStart === "sun" ? 0 : 1;
  const patchSettings = useSettingsStore((s) => s.patch);
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(todayIso);
  const [view, setView] = useState<CalView>(readView);
  const today = todayIso();

  const events = useMemo(() => {
    const list: CalEvent[] = [];
    for (const space of spaces) {
      if (space.type !== "board") continue;
      const board = boards[space.id];
      if (!board) continue;
      for (const card of Object.values(board.cards) as Card[]) {
        if (!card.dueDate) continue;
        const columnId = findColumnOf(board.columns, card.id);
        list.push({
          id: card.id,
          title: card.title,
          dueDate: card.dueDate,
          spaceId: space.id,
          spaceTitle: space.title,
          columnTitle: columnId ? COLUMN_META[columnId].title : "Bacheca",
        });
      }
    }
    return list.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title));
  }, [boards, spaces]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const event of events) {
      const bucket = map.get(event.dueDate) ?? [];
      bucket.push(event);
      map.set(event.dueDate, bucket);
    }
    return map;
  }, [events]);

  function changeView(next: CalView) {
    setView(next);
    patchSettings({ defaultCalView: next });
    window.localStorage.setItem("quadro-cal-view", next);
  }

  function shift(step: number) {
    setCursor((current) => {
      if (view === "week") return addDays(current, step * 7);
      return new Date(current.getFullYear(), current.getMonth() + step, 1);
    });
  }

  function goToday() {
    const now = new Date();
    setCursor(now);
    setSelected(todayIso());
  }

  const rangeLabel =
    view === "week"
      ? weekRangeLabel(cursor, weekStartsOn)
      : formatMonthYear(cursor);
  const now = new Date();
  const atToday =
    view === "agenda" ||
    (view === "week" && weekDays(cursor, weekStartsOn).some((day) => toIsoDate(day) === today)) ||
    (view === "month" &&
      cursor.getMonth() === now.getMonth() &&
      cursor.getFullYear() === now.getFullYear());

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-3 pt-3 sm:px-5 sm:pt-4">
      <header className="mb-3 shrink-0 sm:mb-4">
        <p className="kicker hidden items-center gap-2 text-xs text-muted-foreground md:flex">
          <CalendarDays className="size-3.5" />
          Calendario
        </p>
        <SplitHeadline
          lines={["Le date,", "in vista."]}
          className="mt-2 text-3xl sm:text-4xl"
        />
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <ActionSwapRollButton
            items={[...VIEW_ITEMS]}
            value={view}
            onValueChange={(id) => changeView(id as CalView)}
            variant="secondary"
            className="h-11 min-w-44 font-display text-xs tracking-[0.12em] uppercase"
          />
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <Tooltip content="Indietro" side="bottom">
              <button
                type="button"
                onClick={() => shift(-1)}
                aria-label="Periodo precedente"
                className="inline-flex size-11 items-center justify-center rounded-md hover:bg-accent"
              >
                <ChevronLeft className="size-4" />
              </button>
            </Tooltip>
            <p className="min-w-0 flex-1 truncate text-center font-display text-sm tracking-[0.08em] uppercase">
              <ActionSwapCascadeText value={rangeLabel}>{rangeLabel}</ActionSwapCascadeText>
            </p>
            <Tooltip content="Avanti" side="bottom">
              <button
                type="button"
                onClick={() => shift(1)}
                aria-label="Periodo successivo"
                className="inline-flex size-11 items-center justify-center rounded-md hover:bg-accent"
              >
                <ChevronRight className="size-4" />
              </button>
            </Tooltip>
            <ActionSwapBlurButton
              items={[
                { id: "go", label: "Oggi", ariaLabel: "Vai a oggi" },
                { id: "here", label: "Qui", ariaLabel: "Sei su oggi" },
              ]}
              value={atToday ? "here" : "go"}
              cycle={false}
              variant="ghost"
              size="sm"
              onClick={goToday}
              className="h-11 px-3 font-display text-xs tracking-[0.12em] uppercase"
            />
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-6">
        {view === "month" ? (
          <MonthGrid
            cursor={cursor}
            selected={selected}
            today={today}
            byDate={byDate}
            weekStartsOn={weekStartsOn}
            onSelect={setSelected}
          />
        ) : null}
        {view === "week" ? (
          <WeekGrid cursor={cursor} today={today} byDate={byDate} weekStartsOn={weekStartsOn} />
        ) : null}
        {view === "agenda" ? (
          <AgendaList cursor={cursor} today={today} events={events} />
        ) : null}
      </div>
    </div>
  );
}

function weekRangeLabel(cursor: Date, weekStartsOn: 0 | 1) {
  const days = weekDays(cursor, weekStartsOn);
  const a = days[0].toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  const b = days[6].toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  return `${a} – ${b}`;
}

function MonthGrid({
  cursor,
  selected,
  today,
  byDate,
  weekStartsOn,
  onSelect,
}: {
  cursor: Date;
  selected: string;
  today: string;
  byDate: Map<string, CalEvent[]>;
  weekStartsOn: 0 | 1;
  onSelect: (iso: string) => void;
}) {
  const cells = monthCells(cursor, weekStartsOn);
  const month = cursor.getMonth();
  const selectedEvents = byDate.get(selected) ?? [];
  const labels = weekdayStrip(weekStartsOn);

  return (
    <div>
      <div className="overflow-hidden rounded-3xl bg-surface">
        <div className="grid grid-cols-7">
        {labels.map((label) => (
          <p
            key={label}
            className="py-2 text-center font-display text-[10px] tracking-[0.14em] text-muted-foreground uppercase sm:text-xs"
          >
            {label}
          </p>
        ))}
        {cells.map((date) => {
          const iso = toIsoDate(date);
          const items = byDate.get(iso) ?? [];
          const outside = date.getMonth() !== month;
          const isToday = iso === today;
          const isSelected = iso === selected;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className={cn(
                "flex min-h-16 flex-col items-center gap-1 p-1.5 sm:min-h-24 sm:items-start sm:p-2",
                outside && "opacity-35",
                isSelected && "bg-accent",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-full font-display text-xs tabular-nums",
                  isToday && "bg-foreground text-background",
                  isSelected && !isToday && "bg-card text-foreground",
                )}
              >
                {date.getDate()}
              </span>
              <span className="hidden w-full sm:grid sm:gap-0.5">
                {items.slice(0, 2).map((item) => (
                  <span key={item.id} className="truncate text-[11px] leading-tight">
                    {item.title}
                  </span>
                ))}
                {items.length > 2 ? (
                  <span className="text-[10px] text-muted-foreground">+{items.length - 2}</span>
                ) : null}
              </span>
              {items.length > 0 ? (
                <span className="flex gap-0.5 sm:hidden">
                  {items.slice(0, 3).map((item) => (
                    <span key={item.id} className="size-1 rounded-full bg-foreground" />
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
        </div>
      </div>
      <div className="mt-4 rounded-3xl bg-surface p-4">
        <p className="font-display text-xs tracking-[0.12em] text-muted-foreground uppercase">
          {formatDayHeading(selected)}
        </p>
        {selectedEvents.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Libero</p>
        ) : (
          <ul className="mt-2 grid gap-1">
            {selectedEvents.map((item) => (
              <EventRow key={item.id} event={item} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function WeekGrid({
  cursor,
  today,
  byDate,
  weekStartsOn,
}: {
  cursor: Date;
  today: string;
  byDate: Map<string, CalEvent[]>;
  weekStartsOn: 0 | 1;
}) {
  const days = weekDays(cursor, weekStartsOn);
  return (
    <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-7">
      {days.map((date) => {
        const iso = toIsoDate(date);
        const items = byDate.get(iso) ?? [];
        const isToday = iso === today;
        return (
          <section
            key={iso}
            className={cn(
              "flex min-h-40 flex-col rounded-3xl bg-surface p-3",
              isToday && "ring-1 ring-foreground",
            )}
          >
            <p className="font-display text-xs tracking-[0.12em] uppercase">
              {date.toLocaleDateString("it-IT", { weekday: "short" })}{" "}
              <span className={cn("inline-flex size-6 items-center justify-center rounded-full tabular-nums", isToday && "bg-foreground text-background")}>
                {date.getDate()}
              </span>
            </p>
            <ul className="mt-2 grid gap-1">
              {items.map((item) => (
                <li key={item.id}>
                  <EventRow event={item} compact />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function AgendaList({
  cursor,
  today,
  events,
}: {
  cursor: Date;
  today: string;
  events: CalEvent[];
}) {
  const start = toIsoDate(startOfMonth(cursor));
  const end = toIsoDate(addDays(startOfMonth(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)), -1));
  const visible = events.filter((event) => event.dueDate >= start && event.dueDate <= end);
  const groups = new Map<string, CalEvent[]>();
  for (const event of visible) {
    const bucket = groups.get(event.dueDate) ?? [];
    bucket.push(event);
    groups.set(event.dueDate, bucket);
  }

  if (visible.length === 0) {
    return <p className="text-sm text-muted-foreground">Niente in questo mese</p>;
  }

  return (
    <div className="grid gap-4">
      {[...groups.entries()].map(([iso, items]) => (
        <section key={iso}>
          <p
            className={cn(
              "font-display text-xs tracking-[0.12em] uppercase",
              iso === today ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {formatDayHeading(iso)}
          </p>
          <ul className="mt-2 grid gap-1">
            {items.map((item) => (
              <li key={item.id}>
                <EventRow event={item} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function EventRow({ event, compact = false }: { event: CalEvent; compact?: boolean }) {
  return (
    <Link
      to="/spazio/$spaceId"
      params={{ spaceId: event.spaceId }}
      className={cn(
        "nav-invert flex items-center justify-between gap-3 rounded-xl bg-card px-3 text-card-foreground",
        compact ? "min-h-11 py-1.5" : "min-h-11 py-2.5",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{event.title}</span>
        {compact ? null : (
          <span className="block text-xs text-muted-foreground">
            {event.spaceTitle} · {event.columnTitle}
          </span>
        )}
      </span>
      {compact ? null : <DueChip iso={event.dueDate} />}
    </Link>
  );
}

