import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { arrayMove } from "@dnd-kit/sortable";
import { createId } from "@/lib/utils";
import { DEFAULT_SALES_ID } from "@/lib/spaces-store";
import { useEffect, useState } from "react";

export const STAGE_IDS = ["lead", "offer", "won"] as const;
export type StageId = (typeof STAGE_IDS)[number];

export type Deal = {
  id: string;
  title: string;
  client: string;
  value: number;
  notes: string;
  createdAt: number;
};

export const STAGE_META: Record<StageId, { title: string; hint: string }> = {
  lead: { title: "Lead", hint: "Da chiamare" },
  offer: { title: "Offerta", hint: "In trattativa" },
  won: { title: "Vinto", hint: "Incassato" },
};

const SEED_DEALS: Record<string, Deal> = {
  "deal-1": {
    id: "deal-1",
    title: "Noleggio piattaforme",
    client: "Cantiere Pomezia",
    value: 4200,
    notes: "Due settimane, due macchine. Richiesta per ottobre.",
    createdAt: 1,
  },
  "deal-2": {
    id: "deal-2",
    title: "Pulizia stagionale",
    client: "Garden Village",
    value: 1800,
    notes: "Macchine e detergenti per la stagione estiva.",
    createdAt: 2,
  },
  "deal-3": {
    id: "deal-3",
    title: "Catalogo e stand",
    client: "Fiera Lazio",
    value: 3600,
    notes: "Stampa catalogo + allestimento 12 mq.",
    createdAt: 3,
  },
  "deal-4": {
    id: "deal-4",
    title: "Manutenzione flotta",
    client: "Logistica Roma Sud",
    value: 2500,
    notes: "Contratto annuale chiuso a giugno.",
    createdAt: 4,
  },
};

const SEED_STAGES: Record<StageId, string[]> = {
  lead: ["deal-1", "deal-2"],
  offer: ["deal-3"],
  won: ["deal-4"],
};

export type PipelineData = {
  deals: Record<string, Deal>;
  stages: Record<StageId, string[]>;
};

type SalesState = {
  pipelines: Record<string, PipelineData>;
  ensureSales: (spaceId: string) => void;
  removeSales: (spaceId: string) => void;
  addDeal: (
    spaceId: string,
    stageId: StageId,
    values: { title: string; client: string; value: number; notes: string },
  ) => string;
  updateDeal: (
    spaceId: string,
    id: string,
    values: { title: string; client: string; value: number; notes: string },
  ) => void;
  deleteDeal: (spaceId: string, id: string) => void;
  deleteMany: (spaceId: string, ids: string[]) => void;
  moveDeal: (
    spaceId: string,
    activeId: string,
    toStage: StageId,
    overId: string | null,
  ) => void;
  moveMany: (spaceId: string, ids: string[], toStage: StageId) => void;
  reorderInStage: (
    spaceId: string,
    stageId: StageId,
    activeId: string,
    overId: string,
  ) => void;
};

export const EMPTY_PIPELINE: PipelineData = {
  deals: {},
  stages: { lead: [], offer: [], won: [] },
};

export function emptyPipeline(): PipelineData {
  return { deals: {}, stages: { lead: [], offer: [], won: [] } };
}

export function isStageId(value: string): value is StageId {
  return (STAGE_IDS as readonly string[]).includes(value);
}

export function findStageOf(
  stages: Record<StageId, string[]>,
  dealId: string,
): StageId | null {
  for (const id of STAGE_IDS) {
    if (stages[id].includes(dealId)) return id;
  }
  return null;
}

function cloneStages(stages: Record<StageId, string[]>) {
  return {
    lead: [...stages.lead],
    offer: [...stages.offer],
    won: [...stages.won],
  };
}

function getStorage() {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  return localStorage;
}

function readPipeline(state: SalesState, spaceId: string): PipelineData {
  return state.pipelines[spaceId] ?? EMPTY_PIPELINE;
}

export const useSalesStore = create<SalesState>()(
  persist(
    (set, get) => ({
      pipelines: {
        [DEFAULT_SALES_ID]: { deals: SEED_DEALS, stages: SEED_STAGES },
      },
      ensureSales: (spaceId) => {
        if (get().pipelines[spaceId]) return;
        set((state) => ({
          pipelines: { ...state.pipelines, [spaceId]: emptyPipeline() },
        }));
      },
      removeSales: (spaceId) => {
        set((state) => {
          const { [spaceId]: _removed, ...pipelines } = state.pipelines;
          return { pipelines };
        });
      },
      addDeal: (spaceId, stageId, values) => {
        const id = createId();
        const deal: Deal = {
          id,
          title: values.title.trim(),
          client: values.client.trim(),
          value: Math.max(0, Math.round(values.value)),
          notes: values.notes.trim(),
          createdAt: Date.now(),
        };
        set((state) => {
          const pipeline = readPipeline(state, spaceId);
          return {
            pipelines: {
              ...state.pipelines,
              [spaceId]: {
                deals: { ...pipeline.deals, [id]: deal },
                stages: {
                  ...pipeline.stages,
                  [stageId]: [...pipeline.stages[stageId], id],
                },
              },
            },
          };
        });
        return id;
      },
      updateDeal: (spaceId, id, values) => {
        set((state) => {
          const pipeline = readPipeline(state, spaceId);
          const existing = pipeline.deals[id];
          if (!existing) return state;
          return {
            pipelines: {
              ...state.pipelines,
              [spaceId]: {
                ...pipeline,
                deals: {
                  ...pipeline.deals,
                  [id]: {
                    ...existing,
                    title: values.title.trim(),
                    client: values.client.trim(),
                    value: Math.max(0, Math.round(values.value)),
                    notes: values.notes.trim(),
                  },
                },
              },
            },
          };
        });
      },
      deleteDeal: (spaceId, id) => {
        set((state) => {
          const pipeline = readPipeline(state, spaceId);
          const stageId = findStageOf(pipeline.stages, id);
          const { [id]: _removed, ...deals } = pipeline.deals;
          if (!stageId) {
            return {
              pipelines: { ...state.pipelines, [spaceId]: { ...pipeline, deals } },
            };
          }
          return {
            pipelines: {
              ...state.pipelines,
              [spaceId]: {
                deals,
                stages: {
                  ...pipeline.stages,
                  [stageId]: pipeline.stages[stageId].filter((dealId) => dealId !== id),
                },
              },
            },
          };
        });
      },
      deleteMany: (spaceId, ids) => {
        set((state) => {
          const pipeline = readPipeline(state, spaceId);
          const remove = new Set(ids);
          const deals = { ...pipeline.deals };
          for (const id of remove) delete deals[id];
          return {
            pipelines: {
              ...state.pipelines,
              [spaceId]: {
                deals,
                stages: {
                  lead: pipeline.stages.lead.filter((id) => !remove.has(id)),
                  offer: pipeline.stages.offer.filter((id) => !remove.has(id)),
                  won: pipeline.stages.won.filter((id) => !remove.has(id)),
                },
              },
            },
          };
        });
      },
      moveDeal: (spaceId, activeId, toStage, overId) => {
        set((state) => {
          const pipeline = readPipeline(state, spaceId);
          const fromStage = findStageOf(pipeline.stages, activeId);
          if (!fromStage) return state;
          const stages = cloneStages(pipeline.stages);
          stages[fromStage] = stages[fromStage].filter((id) => id !== activeId);
          const target = stages[toStage];
          let insertIndex = target.length;
          if (overId && overId !== toStage) {
            const idx = target.indexOf(overId);
            if (idx >= 0) insertIndex = idx;
          }
          target.splice(insertIndex, 0, activeId);
          return {
            pipelines: { ...state.pipelines, [spaceId]: { ...pipeline, stages } },
          };
        });
      },
      moveMany: (spaceId, ids, toStage) => {
        set((state) => {
          const pipeline = readPipeline(state, spaceId);
          const unique = ids.filter((id) => pipeline.deals[id]);
          if (unique.length === 0) return state;
          const moving = new Set(unique);
          const stages = cloneStages(pipeline.stages);
          for (const stageId of STAGE_IDS) {
            stages[stageId] = stages[stageId].filter((id) => !moving.has(id));
          }
          stages[toStage] = [...stages[toStage], ...unique];
          return {
            pipelines: { ...state.pipelines, [spaceId]: { ...pipeline, stages } },
          };
        });
      },
      reorderInStage: (spaceId, stageId, activeId, overId) => {
        set((state) => {
          const pipeline = readPipeline(state, spaceId);
          const list = pipeline.stages[stageId];
          const oldIndex = list.indexOf(activeId);
          const newIndex = list.indexOf(overId);
          if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return state;
          return {
            pipelines: {
              ...state.pipelines,
              [spaceId]: {
                ...pipeline,
                stages: {
                  ...pipeline.stages,
                  [stageId]: arrayMove(list, oldIndex, newIndex),
                },
              },
            },
          };
        });
      },
    }),
    {
      name: "bacheca-sales-v1",
      storage: createJSONStorage(getStorage),
      skipHydration: true,
      partialize: (state) => ({ pipelines: state.pipelines }),
      version: 2,
      migrate: (persisted) => {
        const data = persisted as {
          pipelines?: Record<string, PipelineData>;
          deals?: Record<string, Deal>;
          stages?: Record<StageId, string[]>;
        };
        if (data.pipelines) return { pipelines: data.pipelines };
        return {
          pipelines: {
            [DEFAULT_SALES_ID]: {
              deals: data.deals ?? {},
              stages: data.stages ?? { lead: [], offer: [], won: [] },
            },
          },
        };
      },
    },
  ),
);

export function useSalesHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const finish = () => {
      if (active) setHydrated(true);
    };
    const unsub = useSalesStore.persist.onFinishHydration(finish);
    void Promise.resolve(useSalesStore.persist.rehydrate())
      .catch(() => undefined)
      .then(finish);
    if (useSalesStore.persist.hasHydrated()) finish();
    return () => {
      active = false;
      unsub?.();
    };
  }, []);

  return hydrated;
}

export function getPipelineData(spaceId: string): PipelineData {
  return useSalesStore.getState().pipelines[spaceId] ?? EMPTY_PIPELINE;
}

export function countPipeline(pipeline: PipelineData) {
  return STAGE_IDS.reduce((sum, id) => sum + pipeline.stages[id].length, 0);
}

export function countAllPipelines(pipelines: Record<string, PipelineData>) {
  return Object.values(pipelines).reduce((sum, pipeline) => sum + countPipeline(pipeline), 0);
}

export function selectPipelineTotal(pipeline: PipelineData) {
  return STAGE_IDS.reduce((sum, id) => {
    return (
      sum +
      pipeline.stages[id].reduce((acc, dealId) => acc + (pipeline.deals[dealId]?.value ?? 0), 0)
    );
  }, 0);
}

export function selectAllPipelineTotal(pipelines: Record<string, PipelineData>) {
  return Object.values(pipelines).reduce((sum, pipeline) => sum + selectPipelineTotal(pipeline), 0);
}
