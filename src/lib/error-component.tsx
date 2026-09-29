import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { resetQuadro } from "@/lib/quadro-backup";

const FALLBACK_MESSAGE = "Errore imprevisto.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

/**
 * The router's last resort. When data in this browser is what breaks the app,
 * the settings page is out of reach too, so the way out lives here: reload
 * first, clear Quadro's data only after an explicit confirm.
 */
export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <span className="text-destructive" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="font-display text-2xl font-medium tracking-[0.08em] uppercase">
        Qualcosa si è rotto
      </h1>
      <p className="max-w-md text-sm break-words text-muted-foreground">{errorMessage(error)}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-11 items-center rounded-full bg-foreground px-5 font-display text-xs tracking-[0.14em] text-background uppercase"
        >
          Ricarica
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Azzerare Quadro? Spazi, schede, note e vendite di questo browser vanno persi.")) {
              resetQuadro();
            }
          }}
          className="inline-flex h-11 items-center rounded-full px-5 font-display text-xs tracking-[0.14em] text-destructive uppercase hover:bg-destructive/10"
        >
          Azzera i dati
        </button>
      </div>
    </main>
  );
}
