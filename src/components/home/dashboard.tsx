import { type ReactNode, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChartColumn, CircleDollarSign, Columns3, Plus, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { DueStack } from "@/components/due-stack";
import { QuadroMark } from "@/components/brand/logo";
import { CreateAction, useCreateFlash } from "@/components/motion/submit-action";
import { Tooltip } from "@/components/motion/tooltip";
import { SearchField } from "@/components/search-field";
import { SplitHeadline } from "@/components/split-headline";
import {
  CARD_TITLE_MAX,
  COLUMN_IDS,
  COLUMN_META,
  EMPTY_BOARD,
  PRIORITY_META,
  countBoard,
  useBoardStore,
  type Card,
  type PriorityId,
} from "@/lib/board-store";
import { addDays, formatTodayLine, toIsoDate, todayIso } from "@/lib/dates";
import { useNotesStore, type Note } from "@/lib/notes-store";
import {
  EMPTY_PIPELINE,
  STAGE_IDS,
  STAGE_META,
  countPipeline,
  selectAllPipelineTotal,
  useSalesStore,
} from "@/lib/sales-store";
import { SPACE_META, useSpacesStore, type Space } from "@/lib/spaces-store";
import { useSettingsStore } from "@/lib/settings-store";
import { useQuietKeys } from "@/lib/use-quiet-keys";
import { useUiStore } from "@/lib/ui-store";
import { cn, formatEuro, pluralizeNote, pluralizeOfferte, pluralizeSchede } from "@/lib/utils";

const TYPE_ICONS = {
  board: Columns3,
  sales: CircleDollarSign,
  notes: StickyNote,
} as const;

type UpcomingItem = {
  id: string;
  title: string;
  dueDate: string;
  spaceId: string;
  spaceTitle: string;
};

export function HomeDashboard() {
  const navigate = useNavigate();
  const spaces = useSpacesStore((s) => s.spaces);
  const boards = useBoardStore((s) => s.boards);
  const notebooks = useNotesStore((s) => s.notebooks);
  const pipelines = useSalesStore((s) => s.pipelines);
  const dueHorizonDays = useSettingsStore((s) => s.dueHorizonDays);
  const shortcuts = useSettingsStore((s) => s.shortcuts);

  const allCards: Card[] = [];
  const boardCounts = { todo: 0, doing: 0, done: 0 };
  const priorities: Record<PriorityId, number> = { high: 0, med: 0, low: 0 };
  for (const board of Object.values(boards)) {
    boardCounts.todo += board.columns.todo.length;
    boardCounts.doing += board.columns.doing.length;
    boardCounts.done += board.columns.done.length;
    for (const card of Object.values(board.cards)) {
      allCards.push(card);
      priorities[card.priority ?? "med"] += 1;
    }
  }
  const boardTotal = boardCounts.todo + boardCounts.doing + boardCounts.done;
  const donePct = boardTotal ? Math.round((boardCounts.done / boardTotal) * 100) : 0;

  const allNotes: Note[] = Object.values(notebooks).flat();
  const stageCounts = { lead: 0, offer: 0, won: 0 };
  const stageValues = { lead: 0, offer: 0, won: 0 };
  for (const pipeline of Object.values(pipelines)) {
    for (const id of STAGE_IDS) {
      stageCounts[id] += pipeline.stages[id].length;
      stageValues[id] += pipeline.stages[id].reduce(
        (sum, dealId) => sum + (pipeline.deals[dealId]?.value ?? 0),
        0,
      );
    }
  }
  const salesTotal = stageCounts.lead + stageCounts.offer + stageCounts.won;
  const pipelineTotal = selectAllPipelineTotal(pipelines);
  const winPct = salesTotal ? Math.round((stageCounts.won / salesTotal) * 100) : 0;
  const openValue = stageValues.lead + stageValues.offer;

  const firstBoard = spaces.find((space) => space.type === "board");
  const firstSales = spaces.find((space) => space.type === "sales");
  const firstNotes = spaces.find((space) => space.type === "notes");
  const latestNotes = [...allNotes]
    .map((note) => {
      const space = spaces.find((item) => (notebooks[item.id] ?? []).some((n) => n.id === note.id));
      return { note, spaceId: space?.id ?? firstNotes?.id ?? "" };
    })
    .sort((a, b) => b.note.updatedAt - a.note.updatedAt)
    .slice(0, 3);
  const hotCards: { card: Card; spaceId: string }[] = [];
  for (const space of spaces) {
    if (space.type !== "board") continue;
    const board = boards[space.id];
    if (!board) continue;
    for (const card of Object.values(board.cards)) {
      if (card.priority === "high") hotCards.push({ card, spaceId: space.id });
    }
  }
  const shownHot = hotCards.slice(0, 3);

  const today = todayIso();
  const horizon = toIsoDate(addDays(new Date(), dueHorizonDays));
  const upcoming: UpcomingItem[] = [];
  for (const space of spaces) {
    if (space.type !== "board") continue;
    const board = boards[space.id];
    if (!board) continue;
    // Completed cards are done, not due: the board's own stack skips them too.
    const done = new Set(board.columns.done);
    for (const card of Object.values(board.cards)) {
      if (!card.dueDate || card.dueDate > horizon || done.has(card.id)) continue;
      upcoming.push({
        id: card.id,
        title: card.title,
        dueDate: card.dueDate,
        spaceId: space.id,
        spaceTitle: space.title,
      });
    }
  }
  upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title));
  const shownUpcoming = upcoming.slice(0, 6);
  const overdueCount = upcoming.filter((item) => item.dueDate < today).length;

  return (
    <div className="h-full min-h-0 overflow-y-auto px-3 pt-3 pb-8 sm:px-5 sm:pt-4">
      <header className="mb-5">
        <p className="kicker hidden items-center gap-2 text-xs text-muted-foreground md:flex">
          <QuadroMark className="size-5" />
          Quadro
        </p>
        <SplitHeadline lines={["Tutto,", "in un colpo."]} className="mt-2 text-3xl sm:text-4xl" />
        <p className="mt-3 text-sm text-muted-foreground">
          {formatTodayLine()}. Lavoro, vendite, casa.
        </p>
        {shortcuts ? (
          // Keyboard hints mean nothing under a finger: hidden on coarse pointers.
          <p className="mt-1 text-xs text-muted-foreground pointer-coarse:hidden">
            N nuova · ⌘K cerca · ⌘B menu
          </p>
        ) : null}
        <CaptureBar />
      </header>

      <section
        aria-label="Numeri principali"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3"
      >
        <StatTile
          space={firstBoard}
          kicker="Bacheche"
          value={String(boardTotal)}
          hint={pluralizeSchede(boardTotal)}
          tip="Da fare, in corso, fatto — per te o per il team"
          bar={[
            { label: "Da fare", value: boardCounts.todo, className: "bg-todo" },
            { label: "In corso", value: boardCounts.doing, className: "bg-doing" },
            { label: "Completato", value: boardCounts.done, className: "bg-done" },
          ]}
        />
        <StatTile
          space={firstSales}
          kicker="Vendite"
          value={String(salesTotal)}
          hint={`${pluralizeOfferte(salesTotal)} · ${formatEuro(openValue)} aperti`}
          tip="Lead, offerte, chiusure"
        />
        <StatTile
          space={firstNotes}
          kicker="Note"
          value={String(allNotes.length)}
          hint={pluralizeNote(allNotes.length)}
          tip="Idee, liste, briefing"
        />
        <StatTile
          space={firstSales}
          kicker="Valore"
          value={formatEuro(pipelineTotal)}
          hint={`${formatEuro(stageValues.won)} chiusi`}
          invert
          tip="Somma delle trattative"
        />
      </section>

      <section aria-label="Scadenze" className="mt-4 rounded-3xl bg-surface p-3 sm:p-4">
        <header className="mb-3">
          <h2 className="font-display text-sm font-medium tracking-[0.08em] uppercase">Scadenze</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Sempre in evidenza. Passa sopra o tocca.
          </p>
        </header>
        <DueStack
          items={shownUpcoming}
          collapsedLabel={overdueCount > 0 ? `${overdueCount} in ritardo` : "In arrivo"}
          expandedLabel="Calendario"
          onViewAll={() => void navigate({ to: "/calendario" })}
          onItemSelect={(item) => {
            // §4: a tap opens the space — straight on the card that is due.
            useUiStore.getState().requestOpen({ kind: "card", spaceId: item.spaceId, id: item.id });
            void navigate({ to: "/spazio/$spaceId", params: { spaceId: item.spaceId } });
          }}
        />
      </section>

      <section aria-label="Spazi" className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-sm font-medium tracking-[0.08em] uppercase">Spazi</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {spaces.map((space) => {
            const Icon = TYPE_ICONS[space.type];
            const count =
              space.type === "board"
                ? countBoard(boards[space.id] ?? EMPTY_BOARD)
                : space.type === "sales"
                  ? countPipeline(pipelines[space.id] ?? EMPTY_PIPELINE)
                  : (notebooks[space.id] ?? []).length;
            return (
              <Link
                key={space.id}
                to="/spazio/$spaceId"
                params={{ spaceId: space.id }}
                className="nav-invert flex min-h-20 flex-col justify-between rounded-2xl bg-card p-3 text-card-foreground"
              >
                <Icon className="size-4" />
                <span>
                  <span className="block truncate font-display text-sm tracking-[0.08em] uppercase">
                    {space.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {SPACE_META[space.type].hint} · {count}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <Panel space={firstBoard} icon={Columns3} title="Bacheche" hint={`${donePct}% completato`}>
          {COLUMN_IDS.map((id) => (
            <MeterRow
              key={id}
              label={COLUMN_META[id].title}
              value={String(boardCounts[id])}
              ratio={boardTotal ? boardCounts[id] / boardTotal : 0}
            />
          ))}
          <div className="mt-3 flex flex-wrap gap-1">
            {(["high", "med", "low"] as const).map((id) => (
              <span
                key={id}
                className={cn(
                  "rounded-full px-2 py-0.5 font-display text-xs tracking-[0.12em] uppercase",
                  id === "high" && "bg-foreground text-background",
                  id === "med" && "bg-accent text-foreground",
                  id === "low" && "bg-muted text-muted-foreground",
                )}
              >
                {PRIORITY_META[id].title} {priorities[id]}
              </span>
            ))}
          </div>
          {shownHot.length > 0 ? (
            <ul className="mt-3 grid gap-1">
              {shownHot.map(({ card, spaceId }) => (
                <li key={card.id}>
                  <Link
                    to="/spazio/$spaceId"
                    params={{ spaceId }}
                    className="block truncate text-sm text-foreground hover:underline"
                  >
                    {card.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>

        <Panel
          space={firstSales}
          icon={ChartColumn}
          title="Vendite"
          hint={`${winPct}% chiuso · ${formatEuro(openValue)} aperti`}
        >
          {STAGE_IDS.map((id) => (
            <MeterRow
              key={id}
              label={STAGE_META[id].title}
              value={`${stageCounts[id]} · ${formatEuro(stageValues[id])}`}
              ratio={pipelineTotal ? stageValues[id] / pipelineTotal : 0}
            />
          ))}
        </Panel>

        <Panel
          space={firstNotes}
          icon={StickyNote}
          title="Note"
          hint={pluralizeNote(allNotes.length)}
        >
          {latestNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Niente ancora</p>
          ) : (
            <ul className="grid gap-3">
              {latestNotes.map(({ note, spaceId }) => (
                <li key={note.id}>
                  <Link to="/spazio/$spaceId" params={{ spaceId }} className="block">
                    <p className="text-sm font-medium text-foreground">{note.title}</p>
                    {note.body ? (
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {note.body}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function CaptureBar() {
  const [value, setValue] = useState("");
  const createCta = useCreateFlash();
  const spaces = useSpacesStore((s) => s.spaces);
  const addCard = useBoardStore((s) => s.addCard);
  const ensureBoard = useBoardStore((s) => s.ensureBoard);
  const defaultColumn = useSettingsStore((s) => s.defaultColumn);
  const defaultPriority = useSettingsStore((s) => s.defaultPriority);
  const board = spaces.find((space) => space.type === "board");
  // N focuses the capture (§12); Home has no search of its own, so "/" opens the palette.
  useQuietKeys({ onNew: () => document.getElementById("quadro-capture")?.focus() });

  function submit() {
    const title = value.trim();
    if (!title) return;
    if (!board) {
      toast.error("Serve una bacheca: aggiungila dal menu.");
      return;
    }
    // A board with no data yet starts empty here, like opening it does: the
    // capture must not drop the kit's sample cards next to the new one.
    ensureBoard(board.id);
    addCard(board.id, defaultColumn, title, "", defaultPriority, null);
    setValue("");
    createCta.flash();
    toast.success("Aggiunta");
  }

  return (
    <form
      className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <SearchField
        id="quadro-capture"
        value={value}
        onChange={setValue}
        label="Aggiungi una scheda"
        placeholder="Aggiungi una scheda"
        maxLength={CARD_TITLE_MAX}
        icon={Plus}
      />
      <CreateAction value={createCta.value} idle="Aggiungi" done="Aggiunta" onClick={submit} />
    </form>
  );
}

function StatTile({
  space,
  kicker,
  value,
  hint,
  invert = false,
  tip,
  bar,
}: {
  space?: Space;
  kicker: string;
  value: string;
  hint: string;
  invert?: boolean;
  tip: string;
  /** Optional split under the number, e.g. the three board columns. */
  bar?: { label: string; value: number; className: string }[];
}) {
  const barTotal = bar?.reduce((sum, part) => sum + part.value, 0) ?? 0;
  const className = cn(
    "nav-invert flex min-h-28 w-full flex-col justify-between rounded-2xl p-3 sm:min-h-32 sm:p-4",
    invert ? "bg-foreground text-background" : "bg-card text-card-foreground",
  );
  const body = (
    <>
      <p className="font-display text-xs tracking-[0.12em] uppercase opacity-70">{kicker}</p>
      <p className="font-display text-3xl leading-none font-light tracking-tight tabular-nums sm:text-4xl">
        {value}
      </p>
      <span className="block">
        {bar && barTotal > 0 ? (
          <span
            className="mb-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={bar.map((part) => `${part.label} ${part.value}`).join(", ")}
          >
            {bar.map((part) =>
              part.value > 0 ? (
                <span
                  key={part.label}
                  className={cn("h-full", part.className)}
                  style={{ width: `${(part.value / barTotal) * 100}%` }}
                />
              ) : null,
            )}
          </span>
        ) : null}
        <span className="block text-xs opacity-70">{hint}</span>
      </span>
    </>
  );
  const tile = space ? (
    <Link to="/spazio/$spaceId" params={{ spaceId: space.id }} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
  return (
    <Tooltip content={tip} side="bottom" wrapperClassName="block h-full">
      {tile}
    </Tooltip>
  );
}

function Panel({
  space,
  icon: Icon,
  title,
  hint,
  children,
}: {
  space?: Space;
  icon: typeof Columns3;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-3xl bg-surface p-3 sm:p-4">
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-display text-sm font-medium tracking-[0.08em] uppercase">
            <Icon className="size-3.5" />
            {title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        {space ? (
          <Link
            to="/spazio/$spaceId"
            params={{ spaceId: space.id }}
            className="font-display text-xs tracking-[0.12em] text-muted-foreground uppercase hover:text-foreground"
          >
            Apri
          </Link>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function MeterRow({ label, value, ratio }: { label: string; value: string; ratio: number }) {
  const width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
  return (
    <div className="mb-2 last:mb-0">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="text-sm text-foreground">{label}</p>
        <p className="font-display text-xs tabular-nums tracking-wide text-muted-foreground">
          {value}
        </p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-background">
        <div className="stat-bar-fill h-full rounded-full bg-foreground" style={{ width }} />
      </div>
    </div>
  );
}
