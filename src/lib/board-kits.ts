import { createId } from "@/lib/utils";
import { addDaysIso } from "@/lib/dates";
import type { BoardData, ColumnId, PriorityId } from "@/lib/board-store";

export const BOARD_KITS = ["blank", "life", "work", "dev"] as const;
export type BoardKit = (typeof BOARD_KITS)[number];

export const BOARD_KIT_META: Record<
  BoardKit,
  { title: string; hint: string }
> = {
  blank: { title: "Vuota", hint: "Parti da zero" },
  life: { title: "Personale", hint: "Casa e scadenze" },
  work: { title: "Lavoro", hint: "Team e consegne" },
  dev: { title: "Codice", hint: "Bug, review, ship" },
};

type KitCard = {
  title: string;
  description: string;
  priority: PriorityId;
  column: ColumnId;
  dueIn?: number | null;
};

const KITS: Record<Exclude<BoardKit, "blank">, KitCard[]> = {
  life: [
    {
      title: "Pagare le utenze",
      description: "Luce, gas e connessione. Segna la data sul calendario.",
      priority: "high",
      column: "todo",
      dueIn: 3,
    },
    {
      title: "Spesa della settimana",
      description: "Lista corta: fresco, casa, qualcosa di buono.",
      priority: "med",
      column: "todo",
      dueIn: 1,
    },
    {
      title: "Prenotare il controllo",
      description: "Dentista o analisi, prima che scivoli di un mese.",
      priority: "low",
      column: "todo",
      dueIn: 10,
    },
    {
      title: "Allenamento",
      description: "Tre sessioni, anche corte. Basta partire.",
      priority: "med",
      column: "doing",
      dueIn: 0,
    },
    {
      title: "Rinnovare l'assicurazione",
      description: "Confrontare due preventivi e chiudere.",
      priority: "low",
      column: "done",
      dueIn: -12,
    },
  ],
  work: [
    {
      title: "Report della settimana",
      description: "Tre risultati, un blocco, la cosa da sbloccare lunedì.",
      priority: "high",
      column: "todo",
      dueIn: 2,
    },
    {
      title: "Call col cliente",
      description: "Ordine del giorno e next step scritti prima di chiudere.",
      priority: "med",
      column: "todo",
      dueIn: 1,
    },
    {
      title: "Chiudere i feedback",
      description: "Due giri, poi si pubblica. Niente terzo passaggio.",
      priority: "med",
      column: "todo",
      dueIn: 5,
    },
    {
      title: "Onboarding nuovo ingresso",
      description: "Accessi, brief, prima consegna entro dieci giorni.",
      priority: "high",
      column: "doing",
      dueIn: 0,
    },
    {
      title: "Brief approvato",
      description: "Obiettivi e tono firmati. Si può lavorare.",
      priority: "low",
      column: "done",
      dueIn: -4,
    },
  ],
  dev: [
    {
      title: "Riprodurre il bug di login",
      description: "Passi, browser, cosa succede. Poi il fix.",
      priority: "high",
      column: "todo",
      dueIn: 0,
    },
    {
      title: "Review della pull request",
      description: "Diff, test, un commento utile. Poi approve.",
      priority: "med",
      column: "todo",
      dueIn: 1,
    },
    {
      title: "Test sul checkout",
      description: "Percorso felice e un errore di pagamento.",
      priority: "med",
      column: "todo",
      dueIn: 4,
    },
    {
      title: "API pagamenti",
      description: "Webhook, idempotenza, log puliti.",
      priority: "high",
      column: "doing",
      dueIn: 2,
    },
    {
      title: "Pipeline di deploy",
      description: "Build, preview, promozione. Verde in main.",
      priority: "low",
      column: "done",
      dueIn: -6,
    },
  ],
};

export function boardFromKit(kit: BoardKit = "blank"): BoardData {
  if (kit === "blank") {
    return { cards: {}, columns: { todo: [], doing: [], done: [] } };
  }
  const cards: BoardData["cards"] = {};
  const columns: BoardData["columns"] = { todo: [], doing: [], done: [] };
  const now = Date.now();
  KITS[kit].forEach((item, index) => {
    const id = createId();
    cards[id] = {
      id,
      title: item.title,
      description: item.description,
      priority: item.priority,
      dueDate: item.dueIn == null ? null : addDaysIso(item.dueIn),
      createdAt: now + index,
    };
    columns[item.column].push(id);
  });
  return { cards, columns };
}
