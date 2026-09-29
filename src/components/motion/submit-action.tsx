"use client";

import { Check, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActionSwapCascadeButton } from "@/components/motion/action-swap-cascade";
import { cn } from "@/lib/utils";

const SWAP_MS = 560;

export function useSwapSubmit<T>(onSubmit: (values: T) => void, open: boolean) {
  const [phase, setPhase] = useState<"idle" | "done">("idle");
  const timer = useRef(0);
  // The save waiting for the label swap to play. The button already said
  // "Aggiunta" / "Salvato", so closing the dialog early (Esc, the overlay,
  // Annulla) or leaving the page runs it at once instead of dropping it.
  const pending = useRef<(() => void) | null>(null);

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    const run = pending.current;
    pending.current = null;
    run?.();
  }, []);

  useEffect(() => {
    if (open) return;
    setPhase("idle");
    flush();
  }, [open, flush]);

  useEffect(() => flush, [flush]);

  function commit(values: T) {
    if (phase === "done") return;
    setPhase("done");
    pending.current = () => onSubmit(values);
    timer.current = window.setTimeout(flush, SWAP_MS);
  }

  return { phase, commit };
}

const CTA_CLASS = "h-11 font-display text-xs font-medium tracking-[0.14em] uppercase";

export function SubmitAction({
  mode,
  phase,
  className,
}: {
  mode: "create" | "edit";
  phase: "idle" | "done";
  className?: string;
}) {
  return (
    <ActionSwapCascadeButton
      type="submit"
      cycle={false}
      variant="primary"
      size="md"
      value={phase}
      items={
        mode === "edit"
          ? [
              {
                id: "idle",
                label: "Salva",
                icon: <Check className="h-4 w-4" />,
                ariaLabel: "Salva",
              },
              {
                id: "done",
                label: "Salvato",
                icon: <Check className="h-4 w-4" />,
                ariaLabel: "Salvato",
              },
            ]
          : [
              {
                id: "idle",
                label: "Aggiungi",
                icon: <Plus className="h-4 w-4" />,
                ariaLabel: "Aggiungi",
              },
              {
                id: "done",
                label: "Aggiunta",
                icon: <Check className="h-4 w-4" />,
                ariaLabel: "Aggiunta",
              },
            ]
      }
      className={cn(CTA_CLASS, className)}
    />
  );
}

export function useCreateFlash() {
  const [value, setValue] = useState<"new" | "done">("new");
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function flash() {
    setValue("done");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setValue("new"), 1600);
  }

  return { value, flash };
}

export function CreateAction({
  value,
  idle,
  done,
  onClick,
  className,
}: {
  value: "new" | "done";
  idle: string;
  done: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <ActionSwapCascadeButton
      type="button"
      cycle={false}
      variant="primary"
      size="md"
      value={value}
      onClick={onClick}
      items={[
        { id: "new", label: idle, icon: <Plus className="h-4 w-4" />, ariaLabel: idle },
        { id: "done", label: done, icon: <Check className="h-4 w-4" />, ariaLabel: done },
      ]}
      className={cn(CTA_CLASS, "w-full shrink-0 sm:w-auto", className)}
    />
  );
}
