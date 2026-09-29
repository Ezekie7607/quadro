import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useQuietMotion } from "@/lib/use-quiet-motion";
import {
  CalendarDays,
  ChartColumn,
  CircleDollarSign,
  Columns3,
  FileText,
  Plus,
  Search,
  Settings,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import { COLUMN_META, findColumnOf, useBoardStore } from "@/lib/board-store";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/ease";
import { useNotesStore } from "@/lib/notes-store";
import { STAGE_META, findStageOf, useSalesStore } from "@/lib/sales-store";
import { useSettingsStore } from "@/lib/settings-store";
import { SPACE_META, useSpacesStore, type SpaceType } from "@/lib/spaces-store";
import { isDialogOpen, isTypingTarget } from "@/lib/shortcuts";
import { useUiStore, type CreateKind, type OpenTarget } from "@/lib/ui-store";
import { cn, formatEuro } from "@/lib/utils";

const GROUP_ORDER = ["Vai", "Crea", "Schede", "Note", "Offerte"] as const;
type HitGroup = (typeof GROUP_ORDER)[number];

/** Enough to scan with the arrows; the empty palette always lists everything. */
const MAX_RESULTS = 30;

type Hit = {
  id: string;
  group: HitGroup;
  title: string;
  hint: string;
  icon: LucideIcon;
  run: () => void;
};

export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const shortcuts = useSettingsStore((s) => s.shortcuts);
  const reduce = useQuietMotion();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const spaces = useSpacesStore((s) => s.spaces);
  const boards = useBoardStore((s) => s.boards);
  const notebooks = useNotesStore((s) => s.notebooks);
  const pipelines = useSalesStore((s) => s.pipelines);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shortcuts) return;
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      // An open palette always closes; opening waits while someone types or a
      // dialog is up, where the palette would open hidden behind it.
      if (useUiStore.getState().paletteOpen) {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.repeat || isTypingTarget(event.target) || isDialogOpen()) return;
      event.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen, shortcuts]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
      return;
    }
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  const hits = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const go = (to: string, params?: { spaceId: string }) => {
      setOpen(false);
      if (to === "/spazio/$spaceId" && params) {
        void navigate({ to, params });
        return;
      }
      if (to === "/calendario") void navigate({ to: "/calendario" });
      else if (to === "/impostazioni") void navigate({ to: "/impostazioni" });
      else void navigate({ to: "/" });
    };
    const currentId = pathname.startsWith("/spazio/")
      ? decodeURIComponent(pathname.slice("/spazio/".length))
      : null;
    const targetSpace = (type: SpaceType) =>
      spaces.find((item) => item.id === currentId && item.type === type) ??
      spaces.find((item) => item.type === type);
    const createHint = (type: SpaceType, here: string, first: string) =>
      spaces.some((item) => item.id === currentId && item.type === type) ? here : first;

    const create = (kind: CreateKind) => {
      const type =
        kind === "card" ? "board" : kind === "deal" ? "sales" : kind === "note" ? "notes" : null;
      if (!type) {
        useUiStore.getState().requestCreate("space");
        return;
      }
      // The space on screen when it is of the right kind, the first one otherwise.
      const space = targetSpace(type);
      if (!space) {
        useUiStore.getState().requestCreate("space");
        return;
      }
      useUiStore.getState().requestCreate(kind, space.id);
      void navigate({ to: "/spazio/$spaceId", params: { spaceId: space.id } });
    };

    const openItem = (target: OpenTarget) => {
      useUiStore.getState().requestOpen(target);
      void navigate({ to: "/spazio/$spaceId", params: { spaceId: target.spaceId } });
    };

    const items: { hit: Hit; score: number; order: number }[] = [];
    const push = (hit: Hit, ...parts: string[]) => {
      const score = rank(needle, ...parts);
      if (score > 0) items.push({ hit, score, order: items.length });
    };

    push(
      {
        id: "page-home",
        group: "Vai",
        title: "Home",
        hint: "Numeri e scadenze",
        icon: ChartColumn,
        run: () => go("/"),
      },
      "home casa",
    );
    push(
      {
        id: "page-cal",
        group: "Vai",
        title: "Calendario",
        hint: "Mese, settimana, agenda",
        icon: CalendarDays,
        run: () => go("/calendario"),
      },
      "calendario date scadenze",
    );
    push(
      {
        id: "page-set",
        group: "Vai",
        title: "Impostazioni",
        hint: "Studio, default, dati",
        icon: Settings,
        run: () => go("/impostazioni"),
      },
      "impostazioni settings studio",
    );

    for (const space of spaces) {
      const Icon =
        space.type === "board" ? Columns3 : space.type === "sales" ? CircleDollarSign : StickyNote;
      push(
        {
          id: `space-${space.id}`,
          group: "Vai",
          title: space.title,
          hint: SPACE_META[space.type].hint,
          icon: Icon,
          run: () => go("/spazio/$spaceId", { spaceId: space.id }),
        },
        space.title,
        SPACE_META[space.type].title,
      );
    }

    push(
      {
        id: "act-card",
        group: "Crea",
        title: "Nuova scheda",
        hint: createHint("board", "In questa bacheca", "Nella prima bacheca"),
        icon: FileText,
        run: () => create("card"),
      },
      "nuova scheda task",
    );
    push(
      {
        id: "act-note",
        group: "Crea",
        title: "Nuova nota",
        hint: createHint("notes", "In queste note", "Nel primo taccuino"),
        icon: StickyNote,
        run: () => create("note"),
      },
      "nuova nota appunti",
    );
    push(
      {
        id: "act-deal",
        group: "Crea",
        title: "Nuova offerta",
        hint: createHint("sales", "In queste vendite", "Nella prima pipeline"),
        icon: CircleDollarSign,
        run: () => create("deal"),
      },
      "nuova offerta vendita deal",
    );
    push(
      {
        id: "act-space",
        group: "Crea",
        title: "Nuovo spazio",
        hint: "Bacheca, vendite o note",
        icon: Plus,
        run: () => useUiStore.getState().requestCreate("space"),
      },
      "nuovo spazio",
    );

    if (needle) {
      for (const space of spaces) {
        if (space.type !== "board") continue;
        const board = boards[space.id];
        if (!board) continue;
        for (const card of Object.values(board.cards)) {
          const columnId = findColumnOf(board.columns, card.id);
          push(
            {
              id: `card-${card.id}`,
              group: "Schede",
              title: card.title,
              hint: `${space.title} · ${columnId ? COLUMN_META[columnId].title : "Scheda"}`,
              icon: FileText,
              run: () => openItem({ kind: "card", spaceId: space.id, id: card.id }),
            },
            card.title,
            card.description,
            space.title,
          );
        }
      }
      for (const space of spaces) {
        if (space.type !== "notes") continue;
        for (const note of notebooks[space.id] ?? []) {
          push(
            {
              id: `note-${note.id}`,
              group: "Note",
              title: note.title,
              hint: space.title,
              icon: StickyNote,
              run: () => openItem({ kind: "note", spaceId: space.id, id: note.id }),
            },
            note.title,
            note.body,
            space.title,
          );
        }
      }
      for (const space of spaces) {
        if (space.type !== "sales") continue;
        const pipeline = pipelines[space.id];
        if (!pipeline) continue;
        for (const deal of Object.values(pipeline.deals)) {
          const stageId = findStageOf(pipeline.stages, deal.id);
          push(
            {
              id: `deal-${deal.id}`,
              group: "Offerte",
              title: deal.title,
              hint: `${deal.client || space.title}${stageId ? ` · ${STAGE_META[stageId].title}` : ""} · ${formatEuro(deal.value)}`,
              icon: CircleDollarSign,
              run: () => openItem({ kind: "deal", spaceId: space.id, id: deal.id }),
            },
            deal.title,
            deal.client,
            deal.notes,
            space.title,
          );
        }
      }
    }

    // Groups always come in the brief's order (Vai, Crea, then results); inside
    // a group the best match leads and ties keep their natural order. Sorting
    // across groups by score, then title, interleaved them and repeated headers.
    items.sort(
      (a, b) =>
        GROUP_ORDER.indexOf(a.hit.group) - GROUP_ORDER.indexOf(b.hit.group) ||
        b.score - a.score ||
        a.order - b.order,
    );
    const limit = needle ? MAX_RESULTS : Number.POSITIVE_INFINITY;
    const seen = new Set<string>();
    const next: Hit[] = [];
    for (const item of items) {
      if (seen.has(item.hit.id)) continue;
      seen.add(item.hit.id);
      next.push(item.hit);
      if (next.length >= limit) break;
    }
    return next;
  }, [boards, navigate, notebooks, pathname, pipelines, query, setOpen, spaces]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>("[data-active='true']");
    node?.scrollIntoView({ block: "nearest" });
  }, [active, hits]);

  function run(index: number) {
    const hit = hits[index];
    if (!hit) return;
    hit.run();
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-24 sm:px-4"
          data-slot="command-palette"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.12 : 0.2, ease: EASE_OUT }}
        >
          <button
            type="button"
            aria-label="Chiudi cerca"
            className="absolute inset-0 bg-overlay"
            onClick={() => setOpen(false)}
          />
          <motion.div
            role="dialog"
            onKeyDown={(event) => {
              // Esc works wherever focus is inside the palette, and Tab stays in
              // it: the list is driven by the arrows from the field.
              if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
              } else if (event.key === "Tab") {
                event.preventDefault();
                inputRef.current?.focus();
              }
            }}
            aria-modal="true"
            aria-label="Cerca in Quadro"
            initial={
              reduce ? { opacity: 0 } : { opacity: 0, y: 16, filter: "blur(10px)", scale: 0.98 }
            }
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(8px)", scale: 0.98 }}
            transition={reduce ? { duration: 0.12 } : SPRING_LAYOUT}
            className="relative z-10 flex max-h-[min(32rem,70vh)] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-card text-card-foreground shadow-card-hover"
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onBlur={(event) => {
                  // A dialog closing just before the palette opened hands focus back
                  // to the page a beat later; take it back so typing lands here.
                  if (!event.relatedTarget) requestAnimationFrame(() => inputRef.current?.focus());
                }}
                placeholder="Cerca schede, note, spazi…"
                aria-label="Cerca"
                className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setOpen(false);
                    return;
                  }
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActive((i) => Math.min(hits.length - 1, i + 1));
                    return;
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActive((i) => Math.max(0, i - 1));
                    return;
                  }
                  if (event.key === "Enter") {
                    event.preventDefault();
                    run(active);
                  }
                }}
              />
              <kbd className="hidden rounded-full bg-muted px-2 py-1 font-display text-[10px] tracking-[0.12em] text-muted-foreground uppercase sm:inline">
                esc
              </kbd>
            </div>
            <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-2">
              {hits.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Niente trovato
                </p>
              ) : (
                hits.map((hit, index) => {
                  const Icon = hit.icon;
                  const selected = index === active;
                  const showGroup = index === 0 || hits[index - 1].group !== hit.group;
                  return (
                    <div key={hit.id}>
                      {showGroup ? (
                        <p className="px-3 pt-2 pb-1 font-display text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                          {hit.group}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        data-active={selected}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => run(index)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left",
                          selected && "bg-foreground text-background",
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{hit.title}</span>
                          <span
                            className={cn(
                              "block truncate text-xs",
                              selected ? "text-background/70" : "text-muted-foreground",
                            )}
                          >
                            {hit.hint}
                          </span>
                        </span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function rank(needle: string, ...parts: string[]) {
  if (!needle) return 1;
  const hay = parts.join(" ").toLowerCase();
  const head = (parts[0] ?? "").toLowerCase();
  if (head.startsWith(needle)) return 4;
  if (hay.includes(` ${needle}`) || hay.startsWith(needle)) return 3;
  if (hay.includes(needle)) return 2;
  return 0;
}
