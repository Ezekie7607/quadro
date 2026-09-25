import { useEffect, useState, type FormEvent } from "react";
import type { StageId } from "@/lib/sales-store";
import { STAGE_IDS, STAGE_META } from "@/lib/sales-store";
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
import { cn, parseEuro } from "@/lib/utils";

export type DealEditorState =
  | { mode: "create"; stageId: StageId }
  | {
      mode: "edit";
      dealId: string;
      stageId: StageId;
      title: string;
      client: string;
      value: number;
      notes: string;
    };

type DealDialogProps = {
  editor: DealEditorState | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    title: string;
    client: string;
    value: number;
    notes: string;
    stageId: StageId;
  }) => void;
};

export function DealDialog({ editor, onOpenChange, onSubmit }: DealDialogProps) {
  const open = editor !== null;
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [stageId, setStageId] = useState<StageId>("lead");
  const [error, setError] = useState<string | null>(null);
  const isEdit = editor?.mode === "edit";
  const { phase, commit } = useSwapSubmit(onSubmit, open);

  useEffect(() => {
    if (!editor) return;
    if (editor.mode === "edit") {
      setTitle(editor.title);
      setClient(editor.client);
      setValue(editor.value ? String(editor.value) : "");
      setNotes(editor.notes);
      setStageId(editor.stageId);
    } else {
      setTitle("");
      setClient("");
      setValue("");
      setNotes("");
      setStageId(editor.stageId);
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
      client: client.trim(),
      value: parseEuro(value),
      notes: notes.trim(),
      stageId,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Modifica offerta" : "Nuova offerta"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Cambia cliente, valore o fase." : "Titolo, cliente e valore."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="deal-title">Titolo</Label>
            <Input
              id="deal-title"
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

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="deal-client">Cliente</Label>
              <Input
                id="deal-client"
                value={client}
                onChange={(event) => setClient(event.target.value)}
                maxLength={80}
                placeholder="Cliente"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deal-value">Valore (€)</Label>
              <Input
                id="deal-value"
                inputMode="numeric"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="0"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="deal-notes">Note</Label>
            <Textarea
              id="deal-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={1000}
              placeholder="Note"
            />
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-foreground">Fase</legend>
            <div className="grid grid-cols-3 gap-2">
              {STAGE_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStageId(id)}
                  className={cn(
                    "h-11 rounded-xl border px-2 text-xs font-medium transition-colors duration-quick sm:text-sm",
                    stageId === id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {STAGE_META[id].title}
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
