import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { SubmitAction, useSwapSubmit } from "@/components/motion/submit-action";
import { FileUpload, type FileUploadItem } from "@/components/motion/file-upload";
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
import type { NoteFile } from "@/lib/notes-store";

export type NoteEditorState =
  | { mode: "create" }
  | { mode: "edit"; noteId: string; title: string; body: string; attachments: NoteFile[] };

type NoteDialogProps = {
  editor: NoteEditorState | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { title: string; body: string; attachments: NoteFile[] }) => void;
};

function toNoteFiles(items: FileUploadItem[]): NoteFile[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    size: item.size,
    type: item.type ?? "",
    progress: item.status === "success" ? 100 : (item.progress ?? 0),
    status: item.status ?? "queued",
  }));
}

export function NoteDialog({ editor, onOpenChange, onSubmit }: NoteDialogProps) {
  const open = editor !== null;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isEdit = editor?.mode === "edit";
  const { phase, commit } = useSwapSubmit(onSubmit, open);
  const timers = useRef(new Map<string, number>());

  useEffect(() => {
    if (!editor) return;
    if (editor.mode === "edit") {
      setTitle(editor.title);
      setBody(editor.body);
      setFiles(editor.attachments ?? []);
    } else {
      setTitle("");
      setBody("");
      setFiles([]);
    }
    setError(null);
  }, [editor]);

  useEffect(() => {
    return () => {
      for (const timer of timers.current.values()) window.clearInterval(timer);
      timers.current.clear();
    };
  }, []);

  function stopUpload(id: string) {
    const timer = timers.current.get(id);
    if (!timer) return;
    window.clearInterval(timer);
    timers.current.delete(id);
  }

  function startUpload(id: string) {
    stopUpload(id);
    const timer = window.setInterval(() => {
      setFiles((current) => {
        const target = current.find((item) => item.id === id);
        if (target?.status !== "uploading") {
          stopUpload(id);
          return current;
        }
        const nextProgress = Math.min(100, (target.progress ?? 0) + 18 + Math.random() * 16);
        if (nextProgress >= 100) stopUpload(id);
        return current.map((item) =>
          item.id === id
            ? {
                ...item,
                progress: nextProgress,
                status: nextProgress >= 100 ? "success" : "uploading",
              }
            : item,
        );
      });
    }, 180);
    timers.current.set(id, timer);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) {
      setError("Serve un titolo");
      return;
    }
    commit({ title: nextTitle, body: body.trim(), attachments: toNoteFiles(files) });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="grid max-h-[min(80dvh,36rem)] gap-4 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Modifica nota" : "Nuova nota"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Testo e allegati." : "Un appunto, con file se servono."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="note-title">Titolo</Label>
            <Input
              id="note-title"
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
            <Label htmlFor="note-body">Testo</Label>
            <Textarea
              id="note-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={4000}
              placeholder="Testo"
              className="min-h-28"
            />
          </div>

          <FileUpload
            value={files}
            onValueChange={setFiles}
            onFilesAdded={(added) => {
              for (const item of added) startUpload(item.id);
            }}
            onRetry={(item) => startUpload(item.id)}
            onRemove={(item) => stopUpload(item.id)}
            maxFiles={6}
            title="Trascina i file"
            description="PDF, immagini o zip — restano sulla nota"
            browseLabel="Sfoglia"
          />

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
