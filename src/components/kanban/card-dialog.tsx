import { useEffect, useState, type FormEvent } from "react";
import type { ColumnId, PriorityId } from "@/lib/board-store";
import { COLUMN_IDS, COLUMN_META, PRIORITY_IDS, PRIORITY_META } from "@/lib/board-store";
import { Button } from "@/components/ui/button";
import { SubmitAction, useSwapSubmit } from "@/components/motion/submit-action";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/motion/checkbox";
import { addDaysIso, todayIso } from "@/lib/dates";
import { cn } from "@/lib/utils";

const DATE_PRESETS = [
  { label: "Oggi", iso: () => todayIso() },
  { label: "Domani", iso: () => addDaysIso(1) },
  { label: "Settimana", iso: () => addDaysIso(7) },
] as const;

export type CardEditorState =
  | { mode: "create"; columnId: ColumnId; priority?: PriorityId; dueDate?: string | null }
  | {
      mode: "edit";
      cardId: string;
      columnId: ColumnId;
      title: string;
      description: string;
      priority: PriorityId;
      dueDate: string | null;
    };

type CardDialogProps = {
  editor: CardEditorState | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    title: string;
    description: string;
    columnId: ColumnId;
    priority: PriorityId;
    dueDate: string | null;
  }) => void;
};

export function CardDialog({ editor, onOpenChange, onSubmit }: CardDialogProps) {
  const open = editor !== null;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [columnId, setColumnId] = useState<ColumnId>("todo");
  const [priority, setPriority] = useState<PriorityId>("med");
  const [withDate, setWithDate] = useState(false);
  const [dueDate, setDueDate] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);
  const isEdit = editor?.mode === "edit";
  const { phase, commit } = useSwapSubmit(onSubmit, open);

  useEffect(() => {
    if (!editor) return;
    if (editor.mode === "edit") {
      setTitle(editor.title);
      setDescription(editor.description);
      setColumnId(editor.columnId);
      setPriority(editor.priority);
      setWithDate(Boolean(editor.dueDate));
      setDueDate(editor.dueDate ?? todayIso());
    } else {
      setTitle("");
      setDescription("");
      setColumnId(editor.columnId);
      setPriority(editor.priority ?? "med");
      setWithDate(Boolean(editor.dueDate));
      setDueDate(editor.dueDate ?? todayIso());
    }
    setError(null);
  }, [editor]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) {
      setError("Serve un titolo");
      return;
    }
    commit({
      title: nextTitle,
      description: description.trim(),
      columnId,
      priority,
      dueDate: withDate ? dueDate : null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Modifica scheda" : "Nuova scheda"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Cambia titolo, data o colonna." : "Basta il titolo."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="card-title">Titolo</Label>
            <Input
              id="card-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (error) setError(null);
              }}
              maxLength={120}
              placeholder="Titolo"
              autoFocus
              autoComplete="off"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="card-description">Descrizione</Label>
            <Textarea
              id="card-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={1000}
              placeholder="Dettagli"
            />
          </div>

          <div className="rounded-2xl bg-muted px-3 py-2">
            <div className="flex min-h-11 items-center justify-between gap-3">
              <Checkbox
                checked={withDate}
                onCheckedChange={(next) => {
                  setWithDate(next);
                  if (next && !dueDate) setDueDate(todayIso());
                }}
                label="Con data"
              />
            </div>
            {withDate ? (
              <>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  {DATE_PRESETS.map((preset) => {
                    const iso = preset.iso();
                    const active = dueDate === iso;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setDueDate(iso)}
                        className={cn(
                          "h-11 rounded-xl font-display text-xs tracking-[0.08em] uppercase",
                          active
                            ? "bg-foreground text-background"
                            : "bg-card text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                <Input
                  id="card-due"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  aria-label="Data della scheda"
                  className="mt-1 mb-1 bg-card"
                />
              </>
            ) : null}
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-foreground">Priorità</legend>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITY_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPriority(id)}
                  className={cn(
                    "h-11 rounded-xl border px-2 text-xs font-medium transition-colors duration-quick sm:text-sm",
                    priority === id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {PRIORITY_META[id].title}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-foreground">Colonna</legend>
            <div className="grid grid-cols-3 gap-2">
              {COLUMN_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setColumnId(id)}
                  className={cn(
                    "h-11 rounded-xl border px-2 text-xs font-medium transition-colors duration-quick sm:text-sm",
                    columnId === id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {COLUMN_META[id].title}
                </button>
              ))}
            </div>
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <SubmitAction mode={isEdit ? "edit" : "create"} phase={phase} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
