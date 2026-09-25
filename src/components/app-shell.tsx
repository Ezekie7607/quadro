import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  CalendarDays,
  ChartColumn,
  ChevronsUpDown,
  CircleDollarSign,
  Columns3,
  MoreHorizontal,
  PanelLeft,
  Plus,
  Search,
  Settings,
  StickyNote,
  X,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import {
  AnimatedSidebar,
  AnimatedSidebarClose,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupContent,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarHeader,
  AnimatedSidebarInset,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarProvider,
  AnimatedSidebarRail,
  AnimatedSidebarTrigger,
  useAnimatedSidebar,
} from "@/components/motion/animated-sidebar";
import { TextScramble } from "@/components/motion/text-scramble";
import { Tooltip } from "@/components/motion/tooltip";
import { CommandPalette } from "@/components/command-palette";
import { SpaceDialog, type SpaceEditor } from "@/components/spaces/space-dialog";
import { countAllBoards, countBoard, EMPTY_BOARD, useBoardHydrated, useBoardStore } from "@/lib/board-store";
import { type BoardKit } from "@/lib/board-kits";
import { QuadroMark } from "@/components/brand/logo";
import { APP_NAME } from "@/lib/brand";
import { EASE_OUT, SPRING_PRESS } from "@/lib/ease";
import {
  useSettingsHydrated,
  useSettingsStore,
} from "@/lib/settings-store";
import { countAllNotes, useNotesHydrated, useNotesStore } from "@/lib/notes-store";
import {
  countAllPipelines,
  countPipeline,
  EMPTY_PIPELINE,
  useSalesHydrated,
  useSalesStore,
} from "@/lib/sales-store";
import {
  useSpacesHydrated,
  useSpacesStore,
  type Space,
  type SpaceType,
} from "@/lib/spaces-store";
import { cn, pluralizeNote, pluralizeOfferte, pluralizeSchede } from "@/lib/utils";
import { useUiStore } from "@/lib/ui-store";

const TYPE_ICONS = {
  board: Columns3,
  sales: CircleDollarSign,
  notes: StickyNote,
} as const;

export function AppShell({ children }: { children: ReactNode }) {
  useBoardHydrated();
  useNotesHydrated();
  useSalesHydrated();
  useSpacesHydrated();
  useSettingsHydrated();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const studioName = useSettingsStore((s) => s.studioName);
  const density = useSettingsStore((s) => s.density);
  const motionPref = useSettingsStore((s) => s.motion);
  const scramblePref = useSettingsStore((s) => s.scramble);
  const toasts = useSettingsStore((s) => s.toasts);
  const shortcuts = useSettingsStore((s) => s.shortcuts);
  const spaces = useSpacesStore((s) => s.spaces);
  const addSpace = useSpacesStore((s) => s.addSpace);
  const renameSpace = useSpacesStore((s) => s.renameSpace);
  const deleteSpace = useSpacesStore((s) => s.deleteSpace);
  const boards = useBoardStore((s) => s.boards);
  const notebooks = useNotesStore((s) => s.notebooks);
  const pipelines = useSalesStore((s) => s.pipelines);
  const boardCount = countAllBoards(boards);
  const notesCount = countAllNotes(notebooks);
  const salesCount = countAllPipelines(pipelines);
  const [editor, setEditor] = useState<SpaceEditor | null>(null);
  const pendingCreate = useUiStore((s) => s.pendingCreate);
  const pendingSeq = useUiStore((s) => s.pendingSeq);
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const systemReduce = useReducedMotion();
  const reduce = Boolean(systemReduce) || motionPref === "reduce";

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.density = density;
    root.dataset.motion = reduce ? "reduce" : "full";
  }, [density, reduce]);

  useEffect(() => {
    if (!shortcuts) return;
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key !== ",") return;
      event.preventDefault();
      void navigate({ to: "/impostazioni" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, shortcuts]);

  useEffect(() => {
    if (useUiStore.getState().consumeCreate("space")) {
      setEditor({ mode: "create" });
    }
  }, [pendingCreate, pendingSeq]);

  const currentSpaceId = pathname.startsWith("/spazio/")
    ? decodeURIComponent(pathname.slice("/spazio/".length))
    : null;
  const currentSpace = spaces.find((space) => space.id === currentSpaceId);
  const mobileTitle =
    pathname === "/"
      ? "Home"
      : pathname === "/calendario"
        ? "Calendario"
      : pathname === "/impostazioni"
        ? "Impostazioni"
        : (currentSpace?.title ?? "Quadro");

  function handleCreate(type: SpaceType, title: string, kit?: BoardKit) {
    const id = addSpace(type, title);
    if (type === "board") useBoardStore.getState().ensureBoard(id, kit);
    if (type === "sales") useSalesStore.getState().ensureSales(id);
    if (type === "notes") useNotesStore.getState().ensureNotes(id);
    setEditor(null);
    toast.success("Spazio aggiunto");
    void navigate({ to: "/spazio/$spaceId", params: { spaceId: id } });
  }

  function handleRename(id: string, title: string) {
    renameSpace(id, title);
    setEditor(null);
    toast.success("Spazio aggiornato");
  }

  function handleDelete(id: string) {
    const space = spaces.find((item) => item.id === id);
    deleteSpace(id);
    if (space?.type === "board") useBoardStore.getState().removeBoard(id);
    if (space?.type === "sales") useSalesStore.getState().removeSales(id);
    if (space?.type === "notes") useNotesStore.getState().removeNotes(id);
    setEditor(null);
    toast.success("Spazio eliminato");
    if (currentSpaceId === id) {
      void navigate({ to: "/" });
    }
  }

  function spaceCount(space: Space) {
    if (space.type === "board") return countBoard(boards[space.id] ?? EMPTY_BOARD);
    if (space.type === "sales") return countPipeline(pipelines[space.id] ?? EMPTY_PIPELINE);
    return (notebooks[space.id] ?? []).length;
  }

  function datedCount() {
    let count = 0;
    for (const board of Object.values(boards)) {
      for (const card of Object.values(board.cards)) {
        if (card.dueDate) count += 1;
      }
    }
    return count;
  }

  return (
    <AnimatedSidebarProvider
      className="app-stage h-dvh min-h-0 overflow-hidden"
      style={{
        "--sidebar-width": "16.5rem",
        "--sidebar-width-icon": "4.5rem",
        "--sidebar-width-mobile": "18.5rem",
      }}
    >
      <AnimatedSidebar
        ariaLabel="Sezioni"
        collapsible="icon"
        variant="floating"
        className="h-full"
      >
        <AnimatedSidebarHeader className="relative px-3 pt-4 pb-1">
          <button
            type="button"
            onClick={() => void navigate({ to: "/" })}
            className="flex min-h-11 w-full items-center gap-2.5 overflow-hidden rounded-2xl px-2 py-1.5 text-left hover:bg-muted/60 group-data-[state=collapsed]/sidebar:justify-center group-data-[state=collapsed]/sidebar:px-0"
          >
            <QuadroMark className="size-8" animate />
            <div className="min-w-0 flex-1 group-data-[state=collapsed]/sidebar:hidden">
              <p className="truncate text-sm font-semibold text-foreground">{APP_NAME}</p>
              <p className="truncate text-xs text-muted-foreground">{studioName}</p>
            </div>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground group-data-[state=collapsed]/sidebar:hidden" />
          </button>
          <AnimatedSidebarClose className="absolute top-3 right-3 text-muted-foreground hover:bg-muted md:hidden">
            <X className="size-4" />
          </AnimatedSidebarClose>
        </AnimatedSidebarHeader>

        <AnimatedSidebarContent className="px-2 pt-3">
          <AnimatedSidebarGroup>
            <AnimatedSidebarGroupLabel>Studio</AnimatedSidebarGroupLabel>
            <AnimatedSidebarGroupContent>
              <AnimatedSidebarMenu>
                <AnimatedSidebarMenuItem>
                  <AnimatedSidebarMenuButton
                    icon={<ChartColumn className="size-4" />}
                    isActive={pathname === "/"}
                    badge={boardCount + notesCount + salesCount}
                    label="Home"
                    onSelect={() => void navigate({ to: "/" })}
                  >
                    <OpenScramble text="Home" />
                  </AnimatedSidebarMenuButton>
                </AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuItem>
                  <AnimatedSidebarMenuButton
                    icon={<CalendarDays className="size-4" />}
                    isActive={pathname === "/calendario"}
                    badge={datedCount()}
                    label="Calendario"
                    onSelect={() => void navigate({ to: "/calendario" })}
                  >
                    <OpenScramble text="Calendario" />
                  </AnimatedSidebarMenuButton>
                </AnimatedSidebarMenuItem>
              </AnimatedSidebarMenu>
            </AnimatedSidebarGroupContent>
          </AnimatedSidebarGroup>

          <AnimatedSidebarGroup className="pt-3">
            <SpacesLabel onAdd={() => setEditor({ mode: "create" })} />
            <AnimatedSidebarGroupContent>
              <AnimatedSidebarMenu>
                {spaces.map((space) => (
                  <SpaceRow
                    key={space.id}
                    space={space}
                    count={spaceCount(space)}
                    active={currentSpaceId === space.id}
                    onOpen={() =>
                      void navigate({
                        to: "/spazio/$spaceId",
                        params: { spaceId: space.id },
                      })
                    }
                    onEdit={() => setEditor({ mode: "edit", space })}
                  />
                ))}
              </AnimatedSidebarMenu>
            </AnimatedSidebarGroupContent>
          </AnimatedSidebarGroup>
        </AnimatedSidebarContent>

        <AnimatedSidebarFooter className="border-0 px-2 pt-1">
          <AnimatedSidebarMenu>
            <AnimatedSidebarMenuItem>
              <AnimatedSidebarMenuButton
                icon={<Search className="size-4" />}
                label="Cerca"
                onSelect={() => setPaletteOpen(true)}
              >
                Cerca
              </AnimatedSidebarMenuButton>
            </AnimatedSidebarMenuItem>
            <AnimatedSidebarMenuItem>
              <AnimatedSidebarMenuButton
                icon={<Settings className="size-4" />}
                isActive={pathname === "/impostazioni"}
                label="Impostazioni"
                onSelect={() => void navigate({ to: "/impostazioni" })}
              >
                Impostazioni
              </AnimatedSidebarMenuButton>
            </AnimatedSidebarMenuItem>
          </AnimatedSidebarMenu>
          <SidebarStats
            boardCount={boardCount}
            salesCount={salesCount}
            notesCount={notesCount}
          />
        </AnimatedSidebarFooter>

        <AnimatedSidebarRail />
      </AnimatedSidebar>

      <AnimatedSidebarInset className="h-full min-h-0 overflow-hidden bg-transparent">
        <header className="flex h-12 shrink-0 items-center gap-2 px-2 pt-[max(0.35rem,env(safe-area-inset-top))] md:hidden">
          <Tooltip content="Menu" side="bottom">
            <AnimatedSidebarTrigger className="text-foreground hover:bg-accent">
              <PanelLeft className="size-5" />
            </AnimatedSidebarTrigger>
          </Tooltip>
          <p className="min-w-0 flex-1 truncate font-display text-lg font-medium tracking-wide text-foreground uppercase">
            <TextScramble key={mobileTitle} text={mobileTitle} playOnMount duration={480} />
          </p>
          <IconRoundButton
            label="Cerca"
            hint="Cerca"
            active={false}
            side="bottom"
            onClick={() => setPaletteOpen(true)}
          >
            <Search className="h-4 w-4" />
          </IconRoundButton>
          <SettingsIconButton
            active={pathname === "/impostazioni"}
            onClick={() => void navigate({ to: "/impostazioni" })}
            side="bottom"
          />
        </header>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(8px)" }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(6px)" }}
            transition={{ duration: reduce ? 0.12 : 0.32, ease: EASE_OUT }}
            className="min-h-0 flex-1 overflow-hidden"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </AnimatedSidebarInset>

      <CommandPalette />
      <SpaceDialog
        editor={editor}
        spaces={spaces}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
        onCreate={handleCreate}
        onRename={handleRename}
        onDelete={handleDelete}
      />

      {toasts ? (
        <Toaster
          position="bottom-center"
          theme="light"
          toastOptions={{
            className: "font-sans !bg-card !text-foreground !border-border",
          }}
        />
      ) : null}
    </AnimatedSidebarProvider>
  );
}

function OpenScramble({ text }: { text: string }) {
  const { isMobile, open, openMobile } = useAnimatedSidebar();
  const scramble = useSettingsStore((s) => s.scramble);
  const motionPref = useSettingsStore((s) => s.motion);
  const revealed = isMobile ? openMobile : open;
  if (!revealed || !scramble || motionPref === "reduce") return <>{text}</>;
  return <TextScramble text={text} playOnMount duration={Math.min(720, 480 + text.length * 22)} />;
}

function useRailCollapsed() {
  const { isMobile, state } = useAnimatedSidebar();
  return !isMobile && state === "collapsed";
}

function SpacesLabel({ onAdd }: { onAdd: () => void }) {
  const collapsed = useRailCollapsed();
  return (
    <AnimatedSidebarGroupLabel className="flex items-center justify-between gap-2 pr-1">
      Spazi
      {!collapsed ? (
        <Tooltip content="Nuovo spazio" side="left">
          <button
            type="button"
            onClick={onAdd}
            aria-label="Aggiungi spazio"
            className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Plus className="size-3.5" />
          </button>
        </Tooltip>
      ) : null}
    </AnimatedSidebarGroupLabel>
  );
}

function SidebarStats({
  boardCount,
  salesCount,
  notesCount,
}: {
  boardCount: number;
  salesCount: number;
  notesCount: number;
}) {
  const collapsed = useRailCollapsed();
  if (collapsed) return null;
  return (
    <p className="hidden px-3 pt-1 text-xs text-muted-foreground md:block">
      {pluralizeSchede(boardCount)} · {pluralizeOfferte(salesCount)} · {pluralizeNote(notesCount)}
    </p>
  );
}

function IconRoundButton({
  label,
  hint,
  active,
  onClick,
  side = "right",
  children,
}: {
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
  side?: "top" | "right" | "bottom" | "left";
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <Tooltip content={hint} side={side}>
      <motion.button
        type="button"
        aria-label={label}
        aria-current={active ? "page" : undefined}
        onClick={onClick}
        whileTap={reduce ? undefined : { scale: 0.97 }}
        transition={SPRING_PRESS}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground",
          active && "bg-foreground text-background",
        )}
      >
        {children}
      </motion.button>
    </Tooltip>
  );
}

function SettingsIconButton({
  active,
  onClick,
  side = "right",
}: {
  active: boolean;
  onClick: () => void;
  side?: "top" | "right" | "bottom" | "left";
}) {
  const reduce = useReducedMotion();
  const [hot, setHot] = useState(false);

  return (
    <Tooltip content="Impostazioni" side={side}>
      <motion.button
        type="button"
        aria-label="Impostazioni"
        aria-current={active ? "page" : undefined}
        onClick={onClick}
        onPointerEnter={() => setHot(true)}
        onPointerLeave={() => setHot(false)}
        whileTap={reduce ? undefined : { scale: 0.97 }}
        transition={SPRING_PRESS}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground",
          active && "bg-foreground text-background",
        )}
      >
        <motion.span
          aria-hidden="true"
          animate={reduce ? undefined : { rotate: hot || active ? 90 : 0 }}
          transition={SPRING_PRESS}
          className="grid place-items-center"
        >
          <Settings className="h-4 w-4" />
        </motion.span>
      </motion.button>
    </Tooltip>
  );
}

function SpaceRow({
  space,
  count,
  active,
  onOpen,
  onEdit,
}: {
  space: Space;
  count: number;
  active: boolean;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const collapsed = useRailCollapsed();
  const Icon = TYPE_ICONS[space.type];
  return (
    <AnimatedSidebarMenuItem>
      <div className="flex min-w-0 items-center">
        <AnimatedSidebarMenuButton
          icon={<Icon className="size-4" />}
          isActive={active}
          badge={count}
          label={space.title}
          onSelect={onOpen}
          className="min-w-0 flex-1"
        >
          <OpenScramble text={space.title} />
        </AnimatedSidebarMenuButton>
        {!collapsed ? (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Modifica ${space.title}`}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <MoreHorizontal className="size-4" />
          </button>
        ) : null}
      </div>
    </AnimatedSidebarMenuItem>
  );
}
