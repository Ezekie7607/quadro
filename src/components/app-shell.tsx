import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useQuietMotion } from "@/lib/use-quiet-motion";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { countAllBoards, countBoard, EMPTY_BOARD, useBoardHydrated, useBoardStore } from "@/lib/board-store";
import { type BoardKit } from "@/lib/board-kits";
import { QuadroMark } from "@/components/brand/logo";
import { APP_NAME } from "@/lib/brand";
import { SPRING_PRESS } from "@/lib/ease";
import { isShortcutBlocked } from "@/lib/shortcuts";
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
  // Every store rehydrates from localStorage after mount. Pages wait for all
  // five, so nobody sees the seed data first: no flash of sample cards, no
  // "Non c’è più" for a space that simply has not loaded yet, and board or
  // calendar defaults read from the real settings.
  const boardReady = useBoardHydrated();
  const notesReady = useNotesHydrated();
  const salesReady = useSalesHydrated();
  const spacesReady = useSpacesHydrated();
  const settingsReady = useSettingsHydrated();
  const hydrated = boardReady && notesReady && salesReady && spacesReady && settingsReady;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const studioName = useSettingsStore((s) => s.studioName);
  const density = useSettingsStore((s) => s.density);
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
  const [pendingSpaceDelete, setPendingSpaceDelete] = useState<Space | null>(null);
  const pendingCreate = useUiStore((s) => s.pendingCreate);
  const pendingSeq = useUiStore((s) => s.pendingSeq);
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const reduce = useQuietMotion();
  const firstPage = useRef(true);
  useEffect(() => {
    firstPage.current = false;
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.density = density;
    root.dataset.motion = reduce ? "reduce" : "full";
  }, [density, reduce]);

  useEffect(() => {
    if (!shortcuts) return;
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key !== ",") return;
      // Leaving the page here would throw away an open editor or a half-typed field.
      if (isShortcutBlocked(event)) return;
      event.preventDefault();
      void navigate({ to: "/impostazioni" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, shortcuts]);

  // Another tab wrote to the same studio: reload that store instead of letting
  // this tab overwrite the newer data with its stale copy on the next change.
  useEffect(() => {
    const stores: Record<string, { persist: { rehydrate: () => unknown } }> = {
      "quadro-spaces-v1": useSpacesStore,
      "bacheca-v1": useBoardStore,
      "bacheca-notes-v1": useNotesStore,
      "bacheca-sales-v1": useSalesStore,
      "quadro-settings-v1": useSettingsStore,
    };
    function onStorage(event: StorageEvent) {
      if (event.storageArea !== window.localStorage) return;
      const ours = event.key !== null && Object.hasOwn(stores, event.key);
      // A removed key (another tab ran "Azzera") or a cleared storage (key null):
      // start over from the defaults instead of keeping, and on the next change
      // writing back, what this tab still holds in memory.
      if (event.key === null || (ours && event.newValue === null)) {
        window.location.reload();
        return;
      }
      if (ours) void stores[event.key as string].persist.rehydrate();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

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

  function requestDelete(id: string) {
    const space = spaces.find((item) => item.id === id);
    if (!space) return;
    setEditor(null);
    setPendingSpaceDelete(space);
  }

  function handleDelete(id: string) {
    const space = spaces.find((item) => item.id === id);
    setPendingSpaceDelete(null);
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
      keyboardShortcut={shortcuts}
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
              <p className="truncate font-display text-sm font-medium tracking-[0.18em] text-foreground uppercase">
                {APP_NAME}
              </p>
              <p className="truncate text-xs text-muted-foreground">{studioName}</p>
            </div>
            {/* On phones the close button sits in this corner. */}
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground group-data-[state=collapsed]/sidebar:hidden max-md:hidden" />
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
                  // The menu item sits right in the map so the hover pill, which
                  // decorates each direct child, reaches the space rows too.
                  <AnimatedSidebarMenuItem key={space.id}>
                    <SpaceRow
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
                  </AnimatedSidebarMenuItem>
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
            {/* A page title, not a menu label: no scramble (§15). */}
            {mobileTitle}
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
        {/* Enter-only transition. With an exit phase (AnimatePresence "wait") the
            outgoing copy rendered the new route too, so every page mounted
            twice and a dialog opened from the palette left with the copy. */}
        <motion.div
          key={pathname}
          initial={
            firstPage.current
              ? false
              : reduce
                ? { opacity: 0 }
                : { opacity: 0, y: 12, filter: "blur(8px)" }
          }
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: reduce ? 0.12 : 0.32, ease: PAGE_EASE }}
          className="min-h-0 flex-1 overflow-hidden"
        >
          {hydrated ? children : null}
        </motion.div>
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
        onDelete={requestDelete}
      />

      <AlertDialog
        open={pendingSpaceDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSpaceDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingSpaceDelete ? `Eliminare “${pendingSpaceDelete.title}”?` : "Eliminare lo spazio?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingSpaceDelete ? describeSpaceLoss(pendingSpaceDelete, spaceCount(pendingSpaceDelete)) : null}{" "}
              Non si può annullare.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingSpaceDelete) handleDelete(pendingSpaceDelete.id);
              }}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

/** Spec page ease (§15): cubic-bezier(0.22, 1, 0.36, 1). */
const PAGE_EASE = [0.22, 1, 0.36, 1] as const;

function describeSpaceLoss(space: Space, count: number) {
  if (count === 0) return "Lo spazio è vuoto.";
  const what =
    space.type === "board"
      ? pluralizeSchede(count)
      : space.type === "sales"
        ? pluralizeOfferte(count)
        : pluralizeNote(count);
  return count === 1 ? `Con lo spazio se ne va ${what}.` : `Con lo spazio se ne vanno ${what}.`;
}

function OpenScramble({ text }: { text: string }) {
  const { isMobile, open, openMobile } = useAnimatedSidebar();
  const scramble = useSettingsStore((s) => s.scramble);
  const quiet = useQuietMotion();
  const revealed = isMobile ? openMobile : open;
  if (!revealed || !scramble || quiet) return <>{text}</>;
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
            className="-my-2 inline-flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
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
    <p className="px-3 pt-1 text-xs text-muted-foreground">
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
  const reduce = useQuietMotion();
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
  const reduce = useQuietMotion();
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
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <MoreHorizontal className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
