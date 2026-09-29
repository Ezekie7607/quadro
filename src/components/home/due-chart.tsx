import { type KeyboardEvent, type PointerEvent, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { motion } from "motion/react";
import type { DueNotice } from "@/components/due-stack";
import { dueDays } from "@/lib/chart-data";
import { formatDayHeading, formatDayShort, parseIsoDate, weekdayLabel } from "@/lib/dates";
import { EASE_OUT } from "@/lib/ease";
import { useQuietMotion } from "@/lib/use-quiet-motion";
import { cn, pluralizeSchede } from "@/lib/utils";

/** A lone card fills a third of the plot, not all of it. */
const MIN_PEAK = 3;
/** Up to this many day columns, every day gets its own label. */
const DENSE_DAYS = 9;
const MAX_CHIPS = 3;
const OVERDUE_KEY = "overdue";

type Column = { key: string; iso: string | null; items: DueNotice[] };

function columnHeading(column: Column) {
  if (!column.iso) return "In ritardo";
  const heading = formatDayHeading(column.iso);
  return heading.charAt(0).toUpperCase() + heading.slice(1);
}

function inSentence(iso: string) {
  const heading = formatDayHeading(iso);
  return heading.charAt(0).toLowerCase() + heading.slice(1);
}

/**
 * Open cards per day, from today to the horizon, with the overdue ones in a
 * red column of their own in front. Hover, tap, drag or arrow keys pick a
 * day; the line under the plot names it and lists its cards.
 */
export function DueChart({
  items,
  today,
  horizonDays,
  onOpen,
  className,
}: {
  items: DueNotice[];
  today: string;
  horizonDays: number;
  onOpen: (item: DueNotice) => void;
  className?: string;
}) {
  const quiet = useQuietMotion();
  const plotRef = useRef<HTMLDivElement>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const { overdue, days } = dueDays(items, today, horizonDays);
  const columns: Column[] = [
    ...(overdue.length > 0 ? [{ key: OVERDUE_KEY, iso: null, items: overdue }] : []),
    ...days.map((day) => ({ key: day.iso, iso: day.iso, items: day.items })),
  ];
  const peak = Math.max(MIN_PEAK, ...columns.map((column) => column.items.length));
  const ahead = days.reduce((sum, day) => sum + day.items.length, 0);
  const next = days.find((day) => day.items.length > 0);
  // Until someone picks a day, the line under the plot shows the next one due,
  // or the overdue pile when nothing is ahead, and that bar is lit to match.
  const fallback =
    columns.find((column) => column.key === next?.iso) ?? (overdue.length > 0 ? columns[0] : null);
  const active = columns.find((column) => column.key === activeKey) ?? null;
  const shown = active ?? fallback;
  // One tab stop for the whole plot; the arrow keys walk the days from there.
  const tabKey = shown?.key ?? columns[0].key;
  const dense = days.length <= DENSE_DAYS;

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    // A finger keeps its first target for the whole drag: ask what is under it now.
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const column = hit?.closest<HTMLElement>("[data-chart-col]");
    if (column && plotRef.current?.contains(column)) setActiveKey(column.dataset.chartCol ?? null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = columns.length - 1;
    const target =
      event.key === "ArrowRight"
        ? Math.min(last, index + 1)
        : event.key === "ArrowLeft"
          ? Math.max(0, index - 1)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (target === null) return;
    event.preventDefault();
    plotRef.current?.querySelectorAll<HTMLButtonElement>("[data-chart-col]")[target]?.focus();
  }

  return (
    <section
      aria-labelledby="due-chart-title"
      className={cn("flex flex-col rounded-3xl bg-surface p-3 sm:p-4", className)}
    >
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2
            id="due-chart-title"
            className="flex items-center gap-2 font-display text-sm font-medium tracking-[0.08em] uppercase"
          >
            <CalendarDays className="size-3.5" aria-hidden="true" />
            Prossimi {horizonDays} giorni
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {pluralizeSchede(ahead)} in arrivo
            {overdue.length > 0 ? (
              <span className="text-destructive"> · {overdue.length} in ritardo</span>
            ) : null}
          </p>
        </div>
        <Link
          to="/calendario"
          className="font-display text-xs tracking-[0.12em] text-muted-foreground uppercase hover:text-foreground"
        >
          Calendario
        </Link>
      </header>

      <div className="flex flex-1 flex-col rounded-2xl bg-card px-2 pt-5 pb-2 sm:px-3">
        <div
          ref={plotRef}
          role="group"
          aria-label="Schede per giorno di scadenza"
          onPointerMove={handlePointerMove}
          className="flex min-h-32 flex-1 touch-pan-y gap-0.5 border-b border-border sm:gap-1"
        >
          {columns.map((column, index) => {
            const count = column.items.length;
            const ratio = count / peak;
            const late = column.iso === null;
            const weekday = column.iso ? parseIsoDate(column.iso).getDay() : -1;
            return (
              <button
                key={column.key}
                type="button"
                data-chart-col={column.key}
                tabIndex={column.key === tabKey ? 0 : -1}
                aria-label={`${columnHeading(column)}: ${count > 0 ? pluralizeSchede(count) : "niente"}`}
                onFocus={() => setActiveKey(column.key)}
                onClick={() => setActiveKey(column.key)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className={cn(
                  "relative flex h-full min-w-0 flex-1 justify-center rounded-t-md outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                  (weekday === 0 || weekday === 6) && "bg-muted/60",
                  column.key === shown?.key && "bg-accent",
                  late && "mr-1.5 w-9 flex-none sm:mr-2",
                )}
              >
                {count > 0 ? (
                  <>
                    <motion.span
                      aria-hidden="true"
                      className={cn(
                        "absolute bottom-0 h-full w-full max-w-7",
                        late ? "bg-destructive" : "bg-foreground",
                      )}
                      initial={quiet ? false : { clipPath: "inset(100% 0% 0% 0% round 5px)" }}
                      animate={{ clipPath: `inset(${(1 - ratio) * 100}% 0% 0% 0% round 5px)` }}
                      transition={
                        quiet ? { duration: 0 } : { duration: 0.5, ease: EASE_OUT, delay: index * 0.02 }
                      }
                    />
                    <motion.span
                      aria-hidden="true"
                      className={cn(
                        "absolute font-display text-[10px] leading-none tabular-nums",
                        late ? "text-destructive" : "text-foreground",
                      )}
                      style={{ bottom: `calc(${ratio * 100}% + 4px)` }}
                      initial={quiet ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={quiet ? { duration: 0 } : { duration: 0.2, delay: 0.3 + index * 0.02 }}
                    >
                      {count}
                    </motion.span>
                  </>
                ) : (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 h-0.5 w-full max-w-7 rounded-full bg-border"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div
          aria-hidden="true"
          className="mt-1.5 flex gap-0.5 font-display text-[10px] leading-tight tracking-[0.08em] text-muted-foreground uppercase sm:gap-1"
        >
          {columns.map((column, index) => {
            const late = column.iso === null;
            const dayIndex = late ? -1 : index - (overdue.length > 0 ? 1 : 0);
            return (
              <span
                key={column.key}
                className={cn(
                  "relative flex h-6 min-w-0 flex-1 justify-center",
                  late && "mr-1.5 w-9 flex-none text-destructive sm:mr-2",
                )}
              >
                {column.iso ? (
                  <AxisLabel
                    iso={column.iso}
                    dayIndex={dayIndex}
                    dayCount={days.length}
                    dense={dense}
                  />
                ) : (
                  "Scadute"
                )}
              </span>
            );
          })}
        </div>
      </div>

      <div className="mt-3 min-h-16">
        {shown ? (
          <>
            <p className="text-sm">
              {!active && shown.iso ? (
                <>
                  <span className="text-muted-foreground">Prossima scadenza: </span>
                  <span className="font-medium">{inSentence(shown.iso)}</span>
                </>
              ) : (
                <span className="font-medium">{columnHeading(shown)}</span>
              )}
              <span className="text-muted-foreground">
                {" "}
                · {shown.items.length > 0 ? pluralizeSchede(shown.items.length) : "niente in scadenza"}
              </span>
            </p>
            {shown.items.length > 0 ? (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {shown.items.slice(0, MAX_CHIPS).map((item) => (
                  <li key={`${item.spaceId}-${item.id}`} className="max-w-full min-w-0">
                    <button
                      type="button"
                      onClick={() => onOpen(item)}
                      className="flex min-h-8 max-w-full items-center rounded-full bg-card px-3 text-xs text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-11"
                    >
                      <span className="truncate">{item.title}</span>
                    </button>
                  </li>
                ))}
                {shown.items.length > MAX_CHIPS ? (
                  <li className="flex items-center px-1 text-xs text-muted-foreground">
                    +{shown.items.length - MAX_CHIPS}
                  </li>
                ) : null}
              </ul>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Niente in scadenza nei prossimi {horizonDays} giorni.
          </p>
        )}
      </div>
    </section>
  );
}

function AxisLabel({
  iso,
  dayIndex,
  dayCount,
  dense,
}: {
  iso: string;
  dayIndex: number;
  dayCount: number;
  dense: boolean;
}) {
  const date = parseIsoDate(iso);
  if (dense) {
    return (
      <span className={cn("text-center", dayIndex === 0 && "text-foreground")}>
        {dayIndex === 0 ? "Oggi" : weekdayLabel(date)}
        <span className="block tabular-nums">{date.getDate()}</span>
      </span>
    );
  }
  // Too many days for a label each: today, then every Monday that has room.
  if (dayIndex === 0) {
    return <span className="absolute left-0 whitespace-nowrap text-foreground">Oggi</span>;
  }
  if (date.getDay() !== 1 || dayIndex < 3) return null;
  return (
    <span
      className={cn(
        "absolute whitespace-nowrap",
        dayIndex >= dayCount - 2 ? "right-0" : "left-1/2 -translate-x-1/2",
      )}
    >
      {formatDayShort(iso)}
    </span>
  );
}
