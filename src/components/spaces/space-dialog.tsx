import { useEffect, useState, type FormEvent } from "react";
import { LayoutGroup, motion } from "motion/react";
import { Briefcase, CircleDollarSign, Code2, Columns3, Home, Inbox, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitAction, useSwapSubmit } from "@/components/motion/submit-action";
import { Tooltip } from "@/components/motion/tooltip";
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
import {
  BOARD_KITS,
  BOARD_KIT_META,
  type BoardKit,
} from "@/lib/board-kits";
import { SPRING_LAYOUT } from "@/lib/ease";
import { useSettingsStore } from "@/lib/settings-store";
import {
  SPACE_META,
  SPACE_TYPES,
  nextSpaceTitle,
  type Space,
  type SpaceType,
} from "@/lib/spaces-store";
import { cn } from "@/lib/utils";

const TYPE_ICONS = {
  board: Columns3,
  sales: CircleDollarSign,
  notes: StickyNote,
} as const;

const KIT_ICONS = {
  blank: Inbox,
  life: Home,
  work: Briefcase,
  dev: Code2,
} as const;

export type SpaceEditor =
  | { mode: "create" }
  | { mode: "edit"; space: Space };

type SpaceDialogProps = {
  editor: SpaceEditor | null;
  spaces: Space[];
  onOpenChange: (open: boolean) => void;
  onCreate: (type: SpaceType, title: string, kit?: BoardKit) => void;
  onRename: (id: string, title: string) => void;
  onDelete?: (id: string) => void;
};

export function SpaceDialog({
  editor,
  spaces,
  onOpenChange,
  onCreate,
  onRename,
  onDelete,
}: SpaceDialogProps) {
  const open = editor !== null;
  const isEdit = editor?.mode === "edit";
  const [type, setType] = useState<SpaceType>("board");
  const defaultKit = useSettingsStore((s) => s.defaultKit);
  const [kit, setKit] = useState<BoardKit>(defaultKit);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { phase, commit } = useSwapSubmit(
    (values: { type: SpaceType; title: string; kit: BoardKit }) => {
      if (!editor) return;
      if (editor.mode === "create") onCreate(values.type, values.title, values.kit);
      else onRename(editor.space.id, values.title);
    },
    open,
  );

  useEffect(() => {
    if (!editor) return;
    if (editor.mode === "edit") {
      setType(editor.space.type);
      setTitle(editor.space.title);
    } else {
      setType("board");
      setKit(defaultKit);
      setTitle(nextSpaceTitle("board", spaces));
    }
    setError(null);
  }, [editor, spaces, defaultKit]);

  function pickType(next: SpaceType) {
    setType(next);
    setTitle((current) => {
      const previousDefault = nextSpaceTitle(type, spaces);
      if (!current.trim() || current.trim() === previousDefault) {
        return nextSpaceTitle(next, spaces);
      }
      return current;
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) {
      setError("Serve un nome");
      return;
    }
    commit({ type, title: nextTitle, kit });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="grid max-h-[min(80dvh,38rem)] gap-4 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Modifica spazio" : "Nuovo spazio"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Cambia il nome. Il tipo resta."
                : "Bacheca, vendite o note. Poi un kit, se serve."}
            </DialogDescription>
          </DialogHeader>

          {isEdit ? null : (
            <>
              <fieldset className="grid gap-2">
                <legend className="text-sm font-medium">A cosa serve</legend>
                <div className="grid grid-cols-3 gap-2">
                  {SPACE_TYPES.map((id) => {
                    const Icon = TYPE_ICONS[id];
                    const active = type === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => pickType(id)}
                        className={cn(
                          "flex min-h-20 flex-col items-start justify-between rounded-2xl p-2.5 text-left transition-colors",
                          active ? "bg-foreground text-background" : "bg-muted text-foreground",
                        )}
                      >
                        <Icon className="size-4" />
                        <span>
                          <span className="block font-display text-xs tracking-[0.1em] uppercase">
                            {SPACE_META[id].title}
                          </span>
                          <span className="block text-[11px] leading-tight opacity-70">
                            {SPACE_META[id].hint}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {type === "board" ? (
                <fieldset className="grid gap-2">
                  <legend className="text-sm font-medium">Come la riempi</legend>
                  <LayoutGroup id="board-kit">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {BOARD_KITS.map((id) => {
                      const Icon = KIT_ICONS[id];
                      const active = kit === id;
                      const meta = BOARD_KIT_META[id];
                      return (
                        <Tooltip key={id} content={meta.hint} side="bottom" wrapperClassName="block w-full">
                          <button
                            type="button"
                            onClick={() => setKit(id)}
                            className={cn(
                              "relative flex min-h-16 w-full flex-col items-start justify-between rounded-2xl p-2.5 text-left transition-colors",
                              active ? "text-background" : "bg-muted text-foreground hover:bg-accent",
                            )}
                          >
                            {active ? (
                              <motion.span
                                layoutId="quadro-board-kit"
                                className="absolute inset-0 rounded-2xl bg-foreground"
                                transition={SPRING_LAYOUT}
                              />
                            ) : null}
                            <Icon className="relative z-10 size-4" />
                            <span className="relative z-10 font-display text-xs tracking-[0.1em] uppercase">
                              {meta.title}
                            </span>
                          </button>
                        </Tooltip>
                      );
                    })}
                  </div>
                  </LayoutGroup>
                </fieldset>
              ) : null}
            </>
          )}

          <div className="grid gap-2">
            <Label htmlFor="space-title">Nome</Label>
            <Input
              id="space-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Nome"
              autoComplete="off"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter>
            {isEdit && editor.mode === "edit" && onDelete ? (
              <Button
                type="button"
                variant="destructive"
                className="sm:mr-auto"
                onClick={() => onDelete(editor.space.id)}
              >
                Elimina
              </Button>
            ) : null}
            <SubmitAction mode={isEdit ? "edit" : "create"} phase={phase} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
