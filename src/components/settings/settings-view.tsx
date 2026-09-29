import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { LayoutGroup, motion } from "motion/react";
import {
  CalendarDays,
  Check,
  Database,
  Download,
  Keyboard,
  LayoutTemplate,
  SlidersHorizontal,
  Sparkles,
  Upload,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/motion/checkbox";
import { ActionSwapCascadeButton } from "@/components/motion/action-swap-cascade";
import { SplitHeadline } from "@/components/split-headline";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BOARD_KIT_META, BOARD_KITS, type BoardKit } from "@/lib/board-kits";
import {
  COLUMN_IDS,
  COLUMN_META,
  PRIORITY_IDS,
  PRIORITY_META,
  type ColumnId,
  type PriorityId,
} from "@/lib/board-store";
import { SPRING_LAYOUT } from "@/lib/ease";
import {
  BackupError,
  applyBackup,
  exportQuadro,
  readBackup,
  resetQuadro,
  type CheckedBackup,
} from "@/lib/quadro-backup";
import {
  studioInitials,
  useSettingsStore,
  type CalViewPref,
  type Density,
  type HorizonDays,
  type MotionPref,
  type WeekStart,
} from "@/lib/settings-store";
import { cn, pluralizeNote, pluralizeOfferte, pluralizeSchede } from "@/lib/utils";
import { useQuietKeys } from "@/lib/use-quiet-keys";
import { useCoarsePointer } from "@/lib/hooks/use-coarse-pointer";

/**
 * The name as typed, spaces included: the store trims, so feeding it back into
 * the field on every key ate the space in "Studio Rossi" and snapped an empty
 * field back to "Studio". The clean value still reaches the store at once;
 * the field shows it again once focus leaves.
 */
function StudioNameField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  return (
    <Input
      id="studio-name"
      value={draft}
      maxLength={24}
      autoComplete="off"
      className="mt-1.5"
      onFocus={() => setEditing(true)}
      onBlur={() => setEditing(false)}
      onChange={(event) => {
        setDraft(event.target.value);
        onChange(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );
}

function describeBackup(backup: CheckedBackup) {
  const { spaces, cards, deals, notes } = backup.counts;
  const parts = [
    spaces === 1 ? "1 spazio" : `${spaces} spazi`,
    pluralizeSchede(cards),
    pluralizeOfferte(deals),
    pluralizeNote(notes),
  ];
  const day = backup.exportedAt ? new Date(backup.exportedAt) : null;
  const list = parts.join(", ");
  if (!day || Number.isNaN(day.getTime())) return `Nel file: ${list}.`;
  const date = day.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
  return `Copia del ${date}: ${list}.`;
}

const SECTIONS = [
  { id: "studio", label: "Studio", icon: UserRound },
  { id: "schede", label: "Schede", icon: LayoutTemplate },
  { id: "date", label: "Date", icon: CalendarDays },
  { id: "vista", label: "Vista", icon: Sparkles },
  { id: "dati", label: "Dati", icon: Database },
] as const;

export function SettingsView() {
  const settings = useSettingsStore();
  const [section, setSection] = useState<(typeof SECTIONS)[number]["id"]>("studio");
  const [exportPhase, setExportPhase] = useState<"idle" | "done">("idle");
  const [resetOpen, setResetOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<CheckedBackup | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // No search here: "/" opens the palette.
  useQuietKeys();
  const coarsePointer = useCoarsePointer();

  function reportImportError(error: unknown) {
    const message = error instanceof BackupError ? error.message : "File non valido.";
    // Inline as well as a toast: with "Avvisi" off there is no toaster at all.
    setImportError(message);
    toast.error(message);
  }

  useEffect(() => {
    if (exportPhase !== "done") return;
    const timer = window.setTimeout(() => setExportPhase("idle"), 1600);
    return () => window.clearTimeout(timer);
  }, [exportPhase]);

  return (
    <div className="h-full min-h-0 overflow-y-auto px-3 pt-3 pb-10 sm:px-5 sm:pt-4">
      <header className="mb-5">
        <p className="kicker hidden items-center gap-2 text-xs text-muted-foreground md:flex">
          <SlidersHorizontal className="size-3.5" />
          Impostazioni
        </p>
        <SplitHeadline
          lines={["Lo studio,", "come lo vuoi."]}
          className="mt-2 text-3xl sm:text-4xl"
        />
        <p className="mt-3 text-sm text-muted-foreground">
          Default, date, movimento. I dati restano sul dispositivo.
        </p>
      </header>

      <LayoutGroup id="settings-nav">
        <nav
          aria-label="Sezioni impostazioni"
          className="mb-5 flex gap-1 overflow-x-auto rounded-full bg-muted p-1"
        >
          {SECTIONS.map((item) => {
            const active = section === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSection(item.id);
                  document.getElementById(`set-${item.id}`)?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
                className={cn(
                  "relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 font-display text-xs tracking-[0.12em] uppercase",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="settings-section"
                    className="absolute inset-0 rounded-full bg-card shadow-card"
                    transition={SPRING_LAYOUT}
                  />
                ) : null}
                <Icon className="relative z-10 size-3.5" />
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </LayoutGroup>

      <div className="grid max-w-2xl gap-4">
        <SettingsCard id="studio" title="Studio" hint="Come ti presenti nel menu.">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-foreground font-display text-lg font-medium text-background">
              {studioInitials(settings.studioName)}
            </div>
            <div className="min-w-0 flex-1">
              <Label htmlFor="studio-name">Nome</Label>
              <StudioNameField
                value={settings.studioName}
                onChange={(studioName) => settings.patch({ studioName })}
              />
            </div>
          </div>
        </SettingsCard>

        <SettingsCard id="schede" title="Schede nuove" hint="Cosa parte già compilato.">
          <Row label="Priorità" hint="Se non ne scegli una dal menu.">
            <Segmented
              value={settings.defaultPriority}
              onChange={(defaultPriority: PriorityId) => settings.patch({ defaultPriority })}
              items={PRIORITY_IDS.map((id) => ({ id, label: PRIORITY_META[id].title }))}
            />
          </Row>
          <Row label="Colonna" hint="Usata da N e da Nuova.">
            <Segmented
              value={settings.defaultColumn}
              onChange={(defaultColumn: ColumnId) => settings.patch({ defaultColumn })}
              items={COLUMN_IDS.map((id) => ({ id, label: COLUMN_META[id].title }))}
            />
          </Row>
          <Row label="Kit" hint="Quando apri una bacheca nuova.">
            <Segmented
              value={settings.defaultKit}
              onChange={(defaultKit: BoardKit) => settings.patch({ defaultKit })}
              items={BOARD_KITS.map((id) => ({ id, label: BOARD_KIT_META[id].title }))}
            />
          </Row>
        </SettingsCard>

        <SettingsCard id="date" title="Date" hint="Scadenze e calendario.">
          <Row label="Orizzonte" hint="Quanti giorni guarda la home.">
            <Segmented
              value={String(settings.dueHorizonDays)}
              onChange={(raw) => settings.patch({ dueHorizonDays: Number(raw) as HorizonDays })}
              items={[
                { id: "7", label: "7 g" },
                { id: "14", label: "14 g" },
                { id: "30", label: "30 g" },
              ]}
            />
          </Row>
          <Row label="Settimana" hint="Primo giorno in calendario.">
            <Segmented
              value={settings.weekStart}
              onChange={(weekStart: WeekStart) => settings.patch({ weekStart })}
              items={[
                { id: "mon", label: "Lun" },
                { id: "sun", label: "Dom" },
              ]}
            />
          </Row>
          <Row label="Vista" hint="Come si apre il calendario.">
            <Segmented
              value={settings.defaultCalView}
              onChange={(defaultCalView: CalViewPref) => settings.patch({ defaultCalView })}
              items={[
                { id: "month", label: "Mese" },
                { id: "week", label: "Sett." },
                { id: "agenda", label: "Agenda" },
              ]}
            />
          </Row>
          <ToggleRow
            label="Seleziona le scadenze"
            hint="In bacheca, oggi e i ritardi partono già scelti."
            checked={settings.autoSelectDue}
            onCheckedChange={(autoSelectDue) => settings.patch({ autoSelectDue })}
          />
        </SettingsCard>

        <SettingsCard id="vista" title="Vista" hint="Come si muove Quadro.">
          <Row label="Densità" hint="Spazio sulle schede.">
            <Segmented
              value={settings.density}
              onChange={(density: Density) => settings.patch({ density })}
              items={[
                { id: "comfortable", label: "Aria" },
                { id: "compact", label: "Fitta" },
              ]}
            />
          </Row>
          <Row label="Movimento" hint="Morph, scramble, transizioni.">
            <Segmented
              value={settings.motion}
              onChange={(motionPref: MotionPref) => settings.patch({ motion: motionPref })}
              items={[
                { id: "full", label: "Pieno" },
                { id: "reduce", label: "Calmo" },
              ]}
            />
          </Row>
          <ToggleRow
            label="Scrittura in scramble"
            hint="Le etichette del menu si scompongono all’apertura."
            checked={settings.scramble}
            onCheckedChange={(scramble) => settings.patch({ scramble })}
          />
          <ToggleRow
            label="Scorciatoie"
            hint={
              coarsePointer
                ? "Con una tastiera collegata: N nuova, / cerca."
                : "N nuova, / cerca, ⌘K tutto, ⌘B menu, ⌘, qui."
            }
            checked={settings.shortcuts}
            onCheckedChange={(shortcuts) => settings.patch({ shortcuts })}
          />
          <ToggleRow
            label="Avvisi"
            hint="I toast in basso, dopo un’azione."
            checked={settings.toasts}
            onCheckedChange={(toasts) => settings.patch({ toasts })}
          />
          <ToggleRow
            label="Chiedi prima di eliminare"
            hint="Altrimenti la scheda sparisce subito."
            checked={settings.confirmDelete}
            onCheckedChange={(confirmDelete) => settings.patch({ confirmDelete })}
          />
        </SettingsCard>

        <SettingsCard id="dati" title="Dati" hint="Restano solo su questo browser.">
          <div className="flex flex-wrap gap-2">
            <ActionSwapCascadeButton
              type="button"
              cycle={false}
              variant="primary"
              size="md"
              value={exportPhase}
              onClick={() => {
                exportQuadro();
                setExportPhase("done");
                if (useSettingsStore.getState().toasts) toast.success("Copia scaricata");
              }}
              items={[
                {
                  id: "idle",
                  label: "Esporta",
                  icon: <Download className="h-4 w-4" />,
                  ariaLabel: "Esporta",
                },
                {
                  id: "done",
                  label: "Copia scaricata",
                  icon: <Check className="h-4 w-4" />,
                  ariaLabel: "Copia scaricata",
                },
              ]}
              className="h-11 font-display text-xs font-medium tracking-[0.14em] uppercase"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 font-display text-xs font-medium tracking-[0.14em] text-foreground uppercase hover:bg-accent"
            >
              <Upload className="size-4" />
              Importa
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setImportError(null);
                void readBackup(file).then(setPendingImport, reportImportError);
              }}
            />
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="inline-flex h-11 items-center rounded-full px-4 font-display text-xs font-medium tracking-[0.14em] text-destructive uppercase hover:bg-destructive/10"
            >
              Azzera
            </button>
          </div>
          {importError ? (
            <p role="alert" className="mt-3 text-xs font-medium text-destructive">
              {importError}
            </p>
          ) : null}
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Keyboard className="size-3.5" />
            Nessun account. Il file è la tua copia: contiene tutto, in chiaro.
          </p>
        </SettingsCard>
      </div>

      <AlertDialog
        open={pendingImport !== null}
        onOpenChange={(open) => {
          if (!open) setPendingImport(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sostituire tutto con questa copia?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingImport ? describeBackup(pendingImport) : null} Quello che c’è adesso su questo
              browser viene sostituito. Non si può annullare.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingImport) return;
                try {
                  applyBackup(pendingImport);
                } catch (error) {
                  reportImportError(error);
                }
              }}
            >
              Importa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Azzerare Quadro?</AlertDialogTitle>
            <AlertDialogDescription>
              Spazi, schede, note, vendite e queste impostazioni tornano al punto di partenza. Non
              si può annullare.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={resetQuadro}>Azzera</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SettingsCard({
  id,
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section id={`set-${id}`} className="scroll-mt-4 rounded-3xl bg-surface p-3 sm:p-4">
      <header className="mb-3">
        <h2 className="font-display text-sm font-medium tracking-[0.08em] uppercase">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </header>
      <div className="grid gap-4 rounded-2xl bg-card p-3 sm:p-4">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="sm:max-w-[22rem] sm:shrink-0">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (value: T) => void;
  items: { id: T; label: string }[];
}) {
  const layoutId = useId();
  return (
    <div className="flex flex-wrap rounded-full bg-muted p-1">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "relative h-8 min-w-14 flex-1 px-2.5 font-display text-[11px] tracking-[0.12em] uppercase sm:text-xs",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active ? (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-background shadow-card"
                transition={SPRING_LAYOUT}
              />
            ) : null}
            <span className="relative z-10">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
