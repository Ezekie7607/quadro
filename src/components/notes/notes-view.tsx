import { useMemo, useState } from "react";
import { Paperclip, Plus, StickyNote, Trash2 } from "lucide-react";
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
import { NoteDialog, type NoteEditorState } from "@/components/notes/note-dialog";
import { SearchField } from "@/components/search-field";
import { Checkbox } from "@/components/motion/checkbox";
import { SelectionBar } from "@/components/selection-bar";
import { SplitHeadline } from "@/components/split-headline";
import { EMPTY_NOTES, useNotesStore, type Note } from "@/lib/notes-store";
import { SPACE_META } from "@/lib/spaces-store";
import { groupCheckState, useSelection } from "@/lib/selection";
import { formatRelativeTime } from "@/lib/dates";
import { useQuietKeys } from "@/lib/use-quiet-keys";
import { usePaletteRequests } from "@/lib/use-palette-requests";
import { cn, pluralizeNote } from "@/lib/utils";

export function NotesView({ spaceId, title }: { spaceId: string; title: string }) {
  // A stable empty list: `?? []` would hand zustand a new array on every read.
  const notes = useNotesStore((s) => s.notebooks[spaceId] ?? EMPTY_NOTES);
  const addNote = useNotesStore((s) => s.addNote);
  const updateNote = useNotesStore((s) => s.updateNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const deleteMany = useNotesStore((s) => s.deleteMany);
  const [editor, setEditor] = useState<NoteEditorState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [pendingBulk, setPendingBulk] = useState(false);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const selection = useSelection();
  const createCta = useCreateFlash();
  useQuietKeys({ onNew: () => setEditor({ mode: "create" }) });
  usePaletteRequests({
    kind: "note",
    spaceId,
    onCreate: () => setEditor({ mode: "create" }),
    onOpen: (noteId) => {
      setQuery("");
      openEdit(noteId);
    },
  });

  function openEdit(noteId: string) {
    const note = useNotesStore.getState().notebooks[spaceId]?.find((item) => item.id === noteId);
    if (!note) return;
    setEditor({
      mode: "edit",
      noteId: note.id,
      title: note.title,
      body: note.body,
      attachments: note.attachments ?? [],
    });
  }

  const pending = pendingDelete
    ? notes.find((note) => note.id === pendingDelete)
    : undefined;

  const needle = query.trim().toLowerCase();
  const sorted = useMemo(() => {
    return [...notes]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .filter((note) => {
        if (!needle) return true;
        return `${note.title} ${note.body}`.toLowerCase().includes(needle);
      });
  }, [notes, needle]);

  function handleSubmit(values: { title: string; body: string; attachments: Note["attachments"] }) {
    if (!editor) return;
    if (editor.mode === "create") {
      const id = addNote(spaceId, values.title, values.body, values.attachments);
      setFreshId(id);
      window.setTimeout(
        () => setFreshId((current) => (current === id ? null : current)),
        400,
      );
      toast.success("Nota aggiunta");
      createCta.flash();
    } else {
      updateNote(spaceId, editor.noteId, values.title, values.body, values.attachments);
      toast.success("Nota aggiornata");
    }
    setEditor(null);
  }

  function confirmDelete() {
    if (pendingBulk) {
      const ids = [...selection.selected];
      deleteMany(spaceId, ids);
      selection.clear();
      setPendingBulk(false);
      toast.success(ids.length === 1 ? "Nota eliminata" : "Note eliminate");
      return;
    }
    if (!pendingDelete) return;
    deleteNote(spaceId, pendingDelete);
    selection.remove([pendingDelete]);
    setPendingDelete(null);
    toast.success("Nota eliminata");
  }

  return (
    <div className="flex h-full min-h-0 flex-col px-3 pt-3 sm:px-5 sm:pt-4">
      <header className="mb-3 flex shrink-0 flex-col gap-3 sm:mb-4">
        <div className="min-w-0">
          <p className="kicker hidden items-center gap-2 text-xs text-muted-foreground md:flex">
            <StickyNote className="size-3.5" />
            {title}
          </p>
          <SplitHeadline
            lines={[...SPACE_META.notes.headlines]}
            className="mt-2 text-3xl sm:text-4xl"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchField
            value={query}
            onChange={setQuery}
            label="Cerca note"
            placeholder="Cerca note"
          />
          <p className="hidden text-sm text-muted-foreground sm:block">
            {pluralizeNote(notes.length)}
          </p>
          <CreateAction
            value={createCta.value}
            idle="Nuova nota"
            done="Aggiunta"
            onClick={() => setEditor({ mode: "create" })}
          />
        </div>
      </header>

      <section
        aria-labelledby="notes-column"
        className="rise-in flex min-h-0 w-full max-w-xl flex-1 flex-col rounded-3xl bg-surface p-2"
      >
        <header className="flex items-center gap-2 px-2 py-2">
          <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2
              id="notes-column"
              className="font-display text-sm font-medium tracking-[0.08em] text-foreground uppercase"
            >
              {title}
            </h2>
            <p className="text-xs text-muted-foreground">Libere</p>
          </div>
          <NotesSelectAll
            ids={sorted.map((note) => note.id)}
            selected={selection.selected}
            onChange={(checked) =>
              selection.setGroup(
                sorted.map((note) => note.id),
                checked,
              )
            }
          />
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-0.5 py-1">
          {sorted.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              fresh={freshId === note.id}
              selected={selection.selected.has(note.id)}
              onToggleSelect={() => selection.toggle(note.id)}
              onEdit={() => openEdit(note.id)}
              onDelete={() => setPendingDelete(note.id)}
            />
          ))}
          {sorted.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {needle ? "Niente trovato" : "Una lista, un brief, un appunto."}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setEditor({ mode: "create" })}
          className="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-3 font-display text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase transition-colors duration-quick hover:bg-foreground hover:text-background"
        >
          <Plus className="size-4" />
          Aggiungi nota
        </button>
      </section>

      <SelectionBar
        count={selection.selected.size}
        onDelete={() => setPendingBulk(true)}
        onClear={selection.clear}
      />

      <NoteDialog
        editor={editor}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
        onSubmit={handleSubmit}
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
              {pendingBulk ? "Eliminare le note selezionate?" : "Eliminare questa nota?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBulk
                ? `${selection.selected.size === 1 ? "1 nota verrà rimossa" : `${selection.selected.size} note verranno rimosse`}. Non si può annullare.`
                : pending
                  ? `“${pending.title}” verrà rimossa. Non si può annullare.`
                  : "La nota verrà rimossa."}
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

function NoteCard({
  note,
  fresh,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
}: {
  note: Note;
  fresh: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const relative = formatRelativeTime(note.updatedAt);
  return (
    <article
      className={cn(
        "kanban-card group rounded-lg bg-card p-3 text-card-foreground",
        fresh && "card-enter",
        selected && "is-selected",
      )}
    >
      <div className="flex items-start gap-1">
        <Checkbox
          checked={selected}
          aria-label={selected ? `Deseleziona ${note.title}` : `Seleziona ${note.title}`}
          onCheckedChange={() => onToggleSelect()}
          className="mt-1.5 size-8 justify-center"
        />
        <button
          type="button"
          onClick={onEdit}
          className="min-w-0 flex-1 rounded-md px-1 py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <h3 className="text-sm font-medium leading-snug text-foreground">{note.title}</h3>
          {relative ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{relative}</p>
          ) : null}
          {note.body ? (
            <p className="mt-1 line-clamp-4 text-sm leading-normal text-muted-foreground">
              {note.body}
            </p>
          ) : null}
          {(note.attachments ?? []).length > 0 ? (
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Paperclip className="size-3.5" />
              {note.attachments.length === 1
                ? note.attachments[0]?.name
                : `${note.attachments.length} file`}
            </p>
          ) : null}
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Elimina ${note.title}`}
          className="relative mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-quick hover:bg-destructive/10 hover:text-destructive focus-visible:text-destructive focus-visible:ring-2 focus-visible:ring-ring/40 after:absolute after:top-1/2 after:left-1/2 after:size-11 after:-translate-x-1/2 after:-translate-y-1/2 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </article>
  );
}

function NotesSelectAll({
  ids,
  selected,
  onChange,
}: {
  ids: string[];
  selected: Set<string>;
  onChange: (checked: boolean) => void;
}) {
  const group = groupCheckState(ids, selected);
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        checked={group.checked}
        indeterminate={group.indeterminate}
        disabled={group.disabled}
        onCheckedChange={onChange}
        aria-label="Seleziona tutte le note"
      />
      <p className="text-xs font-medium tabular-nums text-muted-foreground">{ids.length}</p>
    </div>
  );
}

