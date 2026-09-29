import { useMemo, useRef, useState } from "react";
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
import { CircleDollarSign } from "lucide-react";
import { toast } from "sonner";
import { CreateAction, useCreateFlash } from "@/components/motion/submit-action";
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
import { DealCardView } from "@/components/sales/deal-card";
import { DealColumn } from "@/components/sales/deal-column";
import { DealDialog, type DealEditorState } from "@/components/sales/deal-dialog";
import { SearchField } from "@/components/search-field";
import { SelectionBar } from "@/components/selection-bar";
import { SplitHeadline } from "@/components/split-headline";
import { useSelection } from "@/lib/selection";
import {
  EMPTY_PIPELINE,
  STAGE_IDS,
  STAGE_META,
  findStageOf,
  getPipelineData,
  isStageId,
  selectPipelineTotal,
  useSalesStore,
  type Deal,
  type PipelineData,
  type StageId,
} from "@/lib/sales-store";
import { SPACE_META } from "@/lib/spaces-store";
import { formatEuro, pluralizeOfferte } from "@/lib/utils";
import { useQuietKeys } from "@/lib/use-quiet-keys";
import { usePaletteRequests } from "@/lib/use-palette-requests";
import { dndAccessibility } from "@/lib/dnd-it";

const dropAnimation: DropAnimation = {
  duration: 220,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.35" } },
  }),
};

const collisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  const pointerDeals = pointer.filter((hit) => !isStageId(String(hit.id)));
  if (pointerDeals.length > 0) return pointerDeals;
  if (pointer.length > 0) return pointer;
  const corners = closestCorners(args);
  const cornerDeals = corners.filter((hit) => !isStageId(String(hit.id)));
  return cornerDeals.length > 0 ? cornerDeals : corners;
};

function matchesQuery(deal: Deal, query: string) {
  if (!query) return true;
  const hay = `${deal.title} ${deal.client} ${deal.notes}`.toLowerCase();
  return hay.includes(query);
}

export function SalesBoard({ spaceId, title }: { spaceId: string; title: string }) {
  const pipeline = useSalesStore((s) => s.pipelines[spaceId] ?? EMPTY_PIPELINE);
  const deals = pipeline.deals;
  const stages = pipeline.stages;
  const addDeal = useSalesStore((s) => s.addDeal);
  const updateDeal = useSalesStore((s) => s.updateDeal);
  const deleteDeal = useSalesStore((s) => s.deleteDeal);
  const deleteMany = useSalesStore((s) => s.deleteMany);
  const moveDeal = useSalesStore((s) => s.moveDeal);
  const moveMany = useSalesStore((s) => s.moveMany);
  const reorderInStage = useSalesStore((s) => s.reorderInStage);
  const setStages = useSalesStore((s) => s.setStages);
  const pipelineTotal = selectPipelineTotal(pipeline);

  const [editor, setEditor] = useState<DealEditorState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [pendingBulk, setPendingBulk] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const draggedRef = useRef(false);
  const dragStartStages = useRef<PipelineData["stages"] | null>(null);
  const selection = useSelection();
  const createCta = useCreateFlash();
  useQuietKeys({ onNew: () => openCreate("lead") });
  usePaletteRequests({
    kind: "deal",
    spaceId,
    onCreate: () => openCreate("lead"),
    onOpen: (dealId) => {
      setQuery("");
      openEdit(dealId);
    },
  });

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const totalCount = useMemo(
    () => STAGE_IDS.reduce((sum, id) => sum + stages[id].length, 0),
    [stages],
  );

  const needle = query.trim().toLowerCase();
  const visible = useMemo(() => {
    const next: Record<StageId, Deal[]> = { lead: [], offer: [], won: [] };
    for (const stageId of STAGE_IDS) {
      next[stageId] = stages[stageId]
        .map((id) => deals[id])
        .filter((deal): deal is Deal => Boolean(deal) && matchesQuery(deal, needle));
    }
    return next;
  }, [deals, stages, needle]);

  const activeDeal = activeId ? deals[activeId] : undefined;
  const pendingDeal = pendingDelete ? deals[pendingDelete] : undefined;

  function restoreDragStart() {
    if (dragStartStages.current) setStages(spaceId, dragStartStages.current);
    dragStartStages.current = null;
  }

  function handleDragStart(event: DragStartEvent) {
    draggedRef.current = true;
    // Stage changes happen live during the drag; a cancelled drag undoes them.
    dragStartStages.current = getPipelineData(spaceId).stages;
    setActiveId(String(event.active.id));
    document.body.style.cursor = "grabbing";
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeDealId = String(active.id);
    const overId = String(over.id);
    const snapshot = getPipelineData(spaceId).stages;
    const from = findStageOf(snapshot, activeDealId);
    const to: StageId | null = isStageId(overId) ? overId : findStageOf(snapshot, overId);
    if (!from || !to || from === to) return;
    moveDeal(spaceId, activeDealId, to, isStageId(overId) ? null : overId);
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
    dragStartStages.current = null;
    const activeDealId = String(active.id);
    const overId = String(over.id);
    const snapshot = getPipelineData(spaceId).stages;
    const from = findStageOf(snapshot, activeDealId);
    const to = isStageId(overId) ? overId : findStageOf(snapshot, overId);
    if (!from || !to) return;
    if (from === to && !isStageId(overId) && activeDealId !== overId) {
      reorderInStage(spaceId, from, activeDealId, overId);
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

  function openCreate(stageId: StageId = "lead") {
    setEditor({ mode: "create", stageId });
  }

  function openEdit(dealId: string) {
    if (draggedRef.current) return;
    const state = getPipelineData(spaceId);
    const deal = state.deals[dealId];
    const stageId = findStageOf(state.stages, dealId);
    if (!deal || !stageId) return;
    setEditor({
      mode: "edit",
      dealId,
      stageId,
      title: deal.title,
      client: deal.client,
      value: deal.value,
      notes: deal.notes,
    });
  }

  function handleEditorSubmit(values: {
    title: string;
    client: string;
    value: number;
    notes: string;
    stageId: StageId;
  }) {
    if (!editor) return;
    if (editor.mode === "create") {
      const id = addDeal(spaceId, values.stageId, values);
      setFreshId(id);
      window.setTimeout(() => setFreshId((current) => (current === id ? null : current)), 400);
      toast.success("Offerta aggiunta");
      createCta.flash();
    } else {
      updateDeal(spaceId, editor.dealId, values);
      const currentStage = findStageOf(getPipelineData(spaceId).stages, editor.dealId);
      if (currentStage && currentStage !== values.stageId) {
        moveDeal(spaceId, editor.dealId, values.stageId, null);
      }
      toast.success("Offerta aggiornata");
    }
    setEditor(null);
  }

  function confirmDelete() {
    if (pendingBulk) {
      const ids = [...selection.selected];
      deleteMany(spaceId, ids);
      selection.clear();
      setPendingBulk(false);
      toast.success(ids.length === 1 ? "Offerta eliminata" : "Offerte eliminate");
      return;
    }
    if (!pendingDelete) return;
    deleteDeal(spaceId, pendingDelete);
    selection.remove([pendingDelete]);
    setPendingDelete(null);
    toast.success("Offerta eliminata");
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <header className="mb-3 flex shrink-0 flex-col gap-3 sm:mb-4">
          <div className="min-w-0">
            <p className="kicker hidden items-center gap-2 text-xs text-muted-foreground md:flex">
              <CircleDollarSign className="size-3.5" />
              {title}
            </p>
            <SplitHeadline
              lines={[...SPACE_META.sales.headlines]}
              className="mt-2 text-3xl sm:text-4xl"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchField
              value={query}
              onChange={setQuery}
              label="Cerca offerte"
              placeholder="Cerca offerte"
            />
            <p className="hidden text-sm text-muted-foreground sm:block">
              {pluralizeOfferte(totalCount)} · {formatEuro(pipelineTotal)}
            </p>
            <CreateAction
              value={createCta.value}
              idle="Nuova offerta"
              done="Aggiunta"
              onClick={() => openCreate("lead")}
            />
          </div>
        </header>

        <DndContext
          id={`sales-${spaceId}`}
          accessibility={dndAccessibility({
            noun: "offerta",
            group: "fase",
            groups: "fasi",
            where: (id) => {
              const stage = isStageId(id) ? id : findStageOf(getPipelineData(spaceId).stages, id);
              return stage ? STAGE_META[stage].title : null;
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
            {STAGE_IDS.map((stageId) => (
              <DealColumn
                key={stageId}
                stageId={stageId}
                deals={visible[stageId]}
                freshId={freshId}
                selectedIds={selection.selected}
                onAdd={() => openCreate(stageId)}
                onEdit={openEdit}
                onDelete={setPendingDelete}
                onToggleSelect={selection.toggle}
                onSelectColumn={(checked) =>
                  selection.setGroup(
                    visible[stageId].map((deal) => deal.id),
                    checked,
                  )
                }
                emptyLabel={needle ? "Niente trovato" : "Vuota"}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={dropAnimation}>
            {activeDeal ? (
              <div className="kanban-card-overlay-inner">
                <DealCardView deal={activeDeal} overlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <SelectionBar
          count={selection.selected.size}
          moveOptions={STAGE_IDS.map((id) => ({
            id,
            label: STAGE_META[id].title,
          }))}
          onMove={(id) => {
            if (!isStageId(id)) return;
            moveMany(spaceId, [...selection.selected], id);
            selection.clear();
            toast.success("Offerte spostate");
          }}
          onDelete={() => setPendingBulk(true)}
          onClear={selection.clear}
        />
      </div>

      <DealDialog
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
              {pendingBulk ? "Eliminare le offerte selezionate?" : "Eliminare questa offerta?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBulk
                ? `${selection.selected.size === 1 ? "1 offerta verrà rimossa" : `${selection.selected.size} offerte verranno rimosse`}. Non si può annullare.`
                : pendingDeal
                  ? `“${pendingDeal.title}” verrà rimossa. Non si può annullare.`
                  : "L’offerta verrà rimossa."}
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
