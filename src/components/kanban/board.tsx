import { useEffect, useMemo, useRef, useState } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  Calendar,
  CalendarPlus,
  CalendarRange,
  CircleDot,
  Columns3,
  FileText,
  Flag,
} from "lucide-react";
import { LayoutGroup, motion } from "motion/react";
import { toast } from "sonner";
import { useCreateFlash } from "@/components/motion/submit-action";
import { BloomMenu, type BloomMenuItem } from "@/components/motion/bloom-menu";
import { DueStack, type DueNotice } from "@/components/due-stack";
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
import { KanbanCardView } from "@/components/kanban/card";
import { CardDialog, type CardEditorState } from "@/components/kanban/card-dialog";
import { KanbanColumn } from "@/components/kanban/column";
import { SearchField } from "@/components/search-field";
import { SelectionBar } from "@/components/selection-bar";
import { SplitHeadline } from "@/components/split-headline";
import {
  COLUMN_IDS,
  COLUMN_META,
  EMPTY_BOARD,
  findColumnOf,
  getBoardData,
  isColumnId,
  useBoardStore,
  type BoardData,
  type Card,
  type ColumnId,
  type PriorityId,
} from "@/lib/board-store";
import { SPACE_META } from "@/lib/spaces-store";
import { addDaysIso, todayIso } from "@/lib/dates";
import { SPRING_LAYOUT } from "@/lib/ease";
import { useSettingsStore } from "@/lib/settings-store";
import { useSelection } from "@/lib/selection";
import { useQuietKeys } from "@/lib/use-quiet-keys";
import { usePaletteRequests } from "@/lib/use-palette-requests";
import { dndAccessibility } from "@/lib/dnd-it";
import { cn, pluralizeSchede } from "@/lib/utils";

const BOARD_CREATE: BloomMenuItem[] = [
  { id: "scheda", label: "Scheda", icon: FileText },
  { id: "oggi", label: "Oggi", icon: Calendar },
  { id: "domani", label: "Domani", icon: CalendarPlus },
  { id: "settimana", label: "Settimana", icon: CalendarRange },
  { id: "alta", label: "Alta", icon: Flag },
  { id: "doing", label: "In corso", icon: CircleDot },
];

const dropAnimation: DropAnimation = {
  duration: 220,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.35" } },
  }),
};

const collisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  const pointerCards = pointer.filter((hit) => !isColumnId(String(hit.id)));
  if (pointerCards.length > 0) return pointerCards;
  if (pointer.length > 0) return pointer;
  const corners = closestCorners(args);
  const cornerCards = corners.filter((hit) => !isColumnId(String(hit.id)));
  return cornerCards.length > 0 ? cornerCards : corners;
};

const BOARD_FILTERS = [
  { id: "all", label: "Tutte" },
  { id: "high", label: "Alta" },
  { id: "today", label: "Oggi" },
  { id: "overdue", label: "Scadute" },
] as const;

type BoardFilter = (typeof BOARD_FILTERS)[number]["id"];

function matchesQuery(card: Card, query: string) {
  if (!query) return true;
  const hay = `${card.title} ${card.description}`.toLowerCase();
  return hay.includes(query);
}

function matchesFilter(card: Card, filter: BoardFilter, columnId: ColumnId, today: string) {
  if (filter === "all") return true;
  if (filter === "high") return card.priority === "high";
  if (filter === "today") return card.dueDate === today;
  if (columnId === "done") return false;
  return Boolean(card.dueDate && card.dueDate < today);
}

export function Board({ spaceId, title }: { spaceId: string; title: string }) {
  const board = useBoardStore((s) => s.boards[spaceId] ?? EMPTY_BOARD);
  const cards = board.cards;
  const columns = board.columns;
  const addCard = useBoardStore((s) => s.addCard);
  const updateCard = useBoardStore((s) => s.updateCard);
  const deleteCard = useBoardStore((s) => s.deleteCard);
  const deleteMany = useBoardStore((s) => s.deleteMany);
  const moveCard = useBoardStore((s) => s.moveCard);
  const moveMany = useBoardStore((s) => s.moveMany);
  const reorderInColumn = useBoardStore((s) => s.reorderInColumn);
  const setColumns = useBoardStore((s) => s.setColumns);

  const [editor, setEditor] = useState<CardEditorState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [pendingBulk, setPendingBulk] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<BoardFilter>("all");
  const draggedRef = useRef(false);
  const dragStartColumns = useRef<BoardData["columns"] | null>(null);
  const selection = useSelection();
  const createCta = useCreateFlash();
  const defaultColumn = useSettingsStore((s) => s.defaultColumn);
  const defaultPriority = useSettingsStore((s) => s.defaultPriority);
  const autoSelectDue = useSettingsStore((s) => s.autoSelectDue);
  const confirmDeletePref = useSettingsStore((s) => s.confirmDelete);
  useQuietKeys({ onNew: () => openCreate(defaultColumn) });
  usePaletteRequests({
    kind: "card",
    spaceId,
    onCreate: () => openCreate(defaultColumn),
    onOpen: (cardId) => {
      // A filter or a search could be hiding the card the palette found.
      setQuery("");
      setFilter("all");
      openEdit(cardId);
    },
  });

  const dueNow = useMemo(() => {
    const today = todayIso();
    const items: DueNotice[] = [];
    for (const card of Object.values(cards)) {
      if (!card.dueDate || card.dueDate > today) continue;
      const columnId = findColumnOf(columns, card.id);
      if (columnId === "done") continue;
      items.push({
        id: card.id,
        title: card.title,
        dueDate: card.dueDate,
        spaceId,
        spaceTitle: title,
      });
    }
    items.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title));
    return items;
  }, [cards, columns, spaceId, title]);

  const primedBoard = useRef<string | null>(null);
  useEffect(() => {
    primedBoard.current = null;
  }, [spaceId]);
  // Once per opening of the board: a card that turns due later must not take
  // over a selection the user made by hand.
  useEffect(() => {
    if (primedBoard.current === spaceId) return;
    primedBoard.current = spaceId;
    if (!autoSelectDue || dueNow.length === 0) return;
    selection.selectMany(dueNow.map((item) => item.id));
  }, [spaceId, dueNow, selection, autoSelectDue]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const total = useMemo(
    () => COLUMN_IDS.reduce((sum, id) => sum + columns[id].length, 0),
    [columns],
  );

  const needle = query.trim().toLowerCase();
  const today = todayIso();
  const visible = useMemo(() => {
    const next: Record<ColumnId, Card[]> = { todo: [], doing: [], done: [] };
    for (const columnId of COLUMN_IDS) {
      next[columnId] = columns[columnId]
        .map((id) => cards[id])
        .filter(
          (card): card is Card =>
            Boolean(card) &&
            matchesQuery(card, needle) &&
            matchesFilter(card, filter, columnId, today),
        );
    }
    return next;
  }, [cards, columns, needle, filter, today]);

  const activeCard = activeId ? cards[activeId] : undefined;
  const pendingCard = pendingDelete ? cards[pendingDelete] : undefined;

  function restoreDragStart() {
    if (dragStartColumns.current) setColumns(spaceId, dragStartColumns.current);
    dragStartColumns.current = null;
  }

  function handleDragStart(event: DragStartEvent) {
    draggedRef.current = true;
    // Cross-column moves happen live during the drag; keep the starting layout
    // so a cancelled drag (Esc, or a drop outside every column) can undo them.
    dragStartColumns.current = getBoardData(spaceId).columns;
    setActiveId(String(event.active.id));
    document.body.style.cursor = "grabbing";
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeCardId = String(active.id);
    const overId = String(over.id);
    const snapshot = getBoardData(spaceId).columns;
    const from = findColumnOf(snapshot, activeCardId);
    const to: ColumnId | null = isColumnId(overId) ? overId : findColumnOf(snapshot, overId);
    if (!from || !to || from === to) return;
    moveCard(spaceId, activeCardId, to, isColumnId(overId) ? null : overId);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    document.body.style.cursor = "";
    setActiveId(null);
    window.setTimeout(() => {
      draggedRef.current = false;
    }, 0);
    if (!over) {
      restoreDragStart();
      return;
    }
    dragStartColumns.current = null;
    const activeCardId = String(active.id);
    const overId = String(over.id);
    const snapshot = getBoardData(spaceId).columns;
    const from = findColumnOf(snapshot, activeCardId);
    const to = isColumnId(overId) ? overId : findColumnOf(snapshot, overId);
    if (!from || !to) return;
    if (from === to && !isColumnId(overId) && activeCardId !== overId) {
      reorderInColumn(spaceId, from, activeCardId, overId);
    }
  }

  function handleDragCancel() {
    document.body.style.cursor = "";
    restoreDragStart();
    setActiveId(null);
    window.setTimeout(() => {
      draggedRef.current = false;
    }, 0);
  }

  function openCreate(
    columnId: ColumnId = defaultColumn,
    extras?: { priority?: PriorityId; dueDate?: string | null },
  ) {
    setEditor({
      mode: "create",
      columnId,
      priority: extras?.priority ?? defaultPriority,
      dueDate: extras?.dueDate,
    });
  }

  function handleBloomSelect(item: BloomMenuItem) {
    if (item.id === "oggi") {
      openCreate(defaultColumn, { dueDate: todayIso() });
      return;
    }
    if (item.id === "domani") {
      openCreate(defaultColumn, { dueDate: addDaysIso(1) });
      return;
    }
    if (item.id === "settimana") {
      openCreate(defaultColumn, { dueDate: addDaysIso(7) });
      return;
    }
    if (item.id === "alta") {
      openCreate(defaultColumn, { priority: "high" });
      return;
    }
    if (item.id === "doing") {
      openCreate("doing");
      return;
    }
    openCreate(defaultColumn);
  }

  function openEdit(cardId: string) {
    if (draggedRef.current) return;
    const state = getBoardData(spaceId);
    const card = state.cards[cardId];
    const columnId = findColumnOf(state.columns, cardId);
    if (!card || !columnId) return;
    setEditor({
      mode: "edit",
      cardId,
      columnId,
      title: card.title,
      description: card.description,
      priority: card.priority ?? "med",
      dueDate: card.dueDate ?? null,
    });
  }

  function handleEditorSubmit(values: {
    title: string;
    description: string;
    columnId: ColumnId;
    priority: PriorityId;
    dueDate: string | null;
  }) {
    if (!editor) return;
    if (editor.mode === "create") {
      const id = addCard(
        spaceId,
        values.columnId,
        values.title,
        values.description,
        values.priority,
        values.dueDate,
      );
      setFreshId(id);
      window.setTimeout(() => setFreshId((current) => (current === id ? null : current)), 400);
      toast.success("Scheda aggiunta");
      createCta.flash();
    } else {
      updateCard(
        spaceId,
        editor.cardId,
        values.title,
        values.description,
        values.priority,
        values.dueDate,
      );
      const currentColumn = findColumnOf(getBoardData(spaceId).columns, editor.cardId);
      if (currentColumn && currentColumn !== values.columnId) {
        moveCard(spaceId, editor.cardId, values.columnId, null);
      }
      toast.success("Scheda aggiornata");
    }
    setEditor(null);
  }

  function requestDelete(id: string) {
    if (!confirmDeletePref) {
      deleteCard(spaceId, id);
      selection.remove([id]);
      toast.success("Scheda eliminata");
      return;
    }
    setPendingDelete(id);
  }

  function requestBulk() {
    if (!confirmDeletePref) {
      const ids = [...selection.selected];
      deleteMany(spaceId, ids);
      selection.clear();
      toast.success(ids.length === 1 ? "Scheda eliminata" : "Schede eliminate");
      return;
    }
    setPendingBulk(true);
  }

  function confirmDelete() {
    if (pendingBulk) {
      const ids = [...selection.selected];
      deleteMany(spaceId, ids);
      selection.clear();
      setPendingBulk(false);
      toast.success(ids.length === 1 ? "Scheda eliminata" : "Schede eliminate");
      return;
    }
    if (!pendingDelete) return;
    deleteCard(spaceId, pendingDelete);
    selection.remove([pendingDelete]);
    setPendingDelete(null);
    toast.success("Scheda eliminata");
  }

  return (
    <div className="flex h-full min-h-0 flex-col px-3 pt-3 sm:px-5 sm:pt-4">
      <header className="relative z-40 mb-3 flex shrink-0 flex-col gap-3 sm:mb-4">
        <div className="min-w-0">
          <p className="kicker hidden items-center gap-2 text-xs text-muted-foreground md:flex">
            <Columns3 className="size-3.5" />
            {title}
          </p>
          <SplitHeadline
            lines={[...SPACE_META.board.headlines]}
            className="mt-2 text-3xl sm:text-4xl"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchField
            value={query}
            onChange={setQuery}
            label="Cerca schede"
            placeholder="Cerca schede"
          />
          <p className="hidden text-sm text-muted-foreground sm:block">{pluralizeSchede(total)}</p>
          <BloomMenu
            items={BOARD_CREATE}
            triggerLabel={createCta.value === "done" ? "Aggiunta" : "Nuova"}
            menuTitle="Nuova scheda"
            onSelect={handleBloomSelect}
          />
        </div>
        <FilterStrip value={filter} onChange={setFilter} />
        {dueNow.length > 0 ? (
          <DueStack
            items={dueNow}
            collapsedLabel={
              dueNow.some((item) => item.dueDate < todayIso()) ? "In ritardo" : "Oggi"
            }
            expandedLabel="Selezionate"
            onViewAll={() => selection.selectMany(dueNow.map((item) => item.id))}
          />
        ) : null}
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <DndContext
          id={`board-${spaceId}`}
          accessibility={dndAccessibility({
            noun: "scheda",
            group: "colonna",
            groups: "colonne",
            where: (id) => {
              const column = isColumnId(id) ? id : findColumnOf(getBoardData(spaceId).columns, id);
              return column ? COLUMN_META[column].title : null;
            },
          })}
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="board-cols flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto pb-1 md:gap-4 md:overflow-x-visible">
            {COLUMN_IDS.map((columnId) => (
              <KanbanColumn
                key={columnId}
                columnId={columnId}
                cards={visible[columnId]}
                freshId={freshId}
                selectedIds={selection.selected}
                onAdd={() => openCreate(columnId)}
                onEdit={openEdit}
                onDelete={requestDelete}
                onToggleSelect={selection.toggle}
                onSelectColumn={(checked) =>
                  selection.setGroup(
                    visible[columnId].map((card) => card.id),
                    checked,
                  )
                }
                emptyLabel={needle || filter !== "all" ? "Niente qui" : "Vuota"}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={dropAnimation}>
            {activeCard ? (
              <div className="kanban-card-overlay-inner">
                <KanbanCardView card={activeCard} overlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <SelectionBar
          count={selection.selected.size}
          moveOptions={COLUMN_IDS.map((id) => ({
            id,
            label: COLUMN_META[id].title,
          }))}
          onMove={(id) => {
            if (!isColumnId(id)) return;
            moveMany(spaceId, [...selection.selected], id);
            selection.clear();
            toast.success("Schede spostate");
          }}
          onDelete={requestBulk}
          onClear={selection.clear}
        />
      </div>

      <CardDialog
        editor={editor}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
        onSubmit={handleEditorSubmit}
      />

      <AlertDialog
        open={Boolean(pendingDelete) || pendingBulk}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
            setPendingBulk(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingBulk ? "Eliminare le schede selezionate?" : "Eliminare questa scheda?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBulk
                ? `${selection.selected.size === 1 ? "1 scheda verrà rimossa" : `${selection.selected.size} schede verranno rimosse`}. Non si può annullare.`
                : pendingCard
                  ? `“${pendingCard.title}” verrà rimossa dalla bacheca. Non si può annullare.`
                  : "La scheda verrà rimossa dalla bacheca."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterStrip({
  value,
  onChange,
}: {
  value: BoardFilter;
  onChange: (value: BoardFilter) => void;
}) {
  return (
    <LayoutGroup id="board-filter">
      <div
        className="flex w-fit flex-wrap rounded-full bg-muted p-1"
        role="tablist"
        aria-label="Filtri"
      >
        {BOARD_FILTERS.map((item) => {
          const active = item.id === value;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(item.id)}
              className={cn(
                "relative h-8 px-3 font-display text-[11px] tracking-[0.12em] uppercase sm:text-xs",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="board-filter-pill"
                  className="absolute inset-0 rounded-full bg-card shadow-card"
                  transition={SPRING_LAYOUT}
                />
              ) : null}
              <span className="relative z-10">{item.label}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
