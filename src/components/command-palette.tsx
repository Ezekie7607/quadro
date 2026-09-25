import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
import { SPACE_META, useSpacesStore } from "@/lib/spaces-store";
import { useUiStore, type CreateKind } from "@/lib/ui-store";
import { cn, formatEuro } from "@/lib/utils";

type Hit = {
  id: string;
  group: string;
  title: string;
  hint: string;
  icon: LucideIcon;
  run: () => void;
};

export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const shortcuts = useSettingsStore((s) => s.shortcuts);
  const reduce = useReducedMotion();
  const navigate = useNavigate();
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
      event.preventDefault();
      setOpen(!useUiStore.getState().paletteOpen);
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
    const create = (kind: CreateKind) => {
      const type = kind === "card" ? "board" : kind === "deal" ? "sales" : kind === "note" ? "notes" : null;
      if (!type) {
        useUiStore.getState().requestCreate("space");
        return;
      }
      const space = spaces.find((item) => item.type === type);
      if (!space) {
        useUiStore.getState().requestCreate("space");
        return;
      }
      useUiStore.getState().requestCreate(kind);
      void navigate({ to: "/spazio/$spaceId", params: { spaceId: space.id } });
    };

    const items: { hit: Hit; score: number }[] = [];
    const push = (hit: Hit, ...parts: string[]) => {
      const score = rank(needle, ...parts);
      if (score > 0) items.push({ hit, score });
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

    push(
      {
        id: "act-card",
        group: "Crea",
        title: "Nuova scheda",
        hint: "Nella prima bacheca",
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
        hint: "Nel primo taccuino",
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
        hint: "Nella pipeline",
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

    for (const space of spaces) {
      const Icon =
        space.type === "board" ? Columns3 : space.type === "sales" ? CircleDollarSign : StickyNote;
      push(
        {
          id: `space-${space.id}`,
          group: "Spazi",
          title: space.title,
          hint: SPACE_META[space.type].hint,
          icon: Icon,
          run: () => go("/spazio/$spaceId", { spaceId: space.id }),
        },
        space.title,
        SPACE_META[space.type].title,
      );
    }

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
              run: () => go("/spazio/$spaceId", { spaceId: space.id }),
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
              run: () => go("/spazio/$spaceId", { spaceId: space.id }),
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
              run: () => go("/spazio/$spaceId", { spaceId: space.id }),
            },
            deal.title,
            deal.client,
            deal.notes,
            space.title,
          );
        }
      }
    }

    items.sort((a, b) => b.score - a.score || a.hit.title.localeCompare(b.hit.title, "it"));
    const seen = new Set<string>();
    const next: Hit[] = [];
    for (const item of items) {
      if (seen.has(item.hit.id)) continue;
      seen.add(item.hit.id);
      next.push(item.hit);
      if (next.length >= 10) break;
    }
    return next;
  }, [boards, navigate, notebooks, pipelines, query, setOpen, spaces]);

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
            aria-modal="true"
            aria-label="Cerca in Quadro"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, filter: "blur(10px)", scale: 0.98 }}
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
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">Niente trovato</p>
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
