"use client";

import { Check, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ActionSwapCascadeButton } from "@/components/motion/action-swap-cascade";
import { cn } from "@/lib/utils";

const SWAP_MS = 560;

export function useSwapSubmit<T>(onSubmit: (values: T) => void, open: boolean) {
  const [phase, setPhase] = useState<"idle" | "done">("idle");
  const timer = useRef(0);

  useEffect(() => {
    if (open) return;
    setPhase("idle");
    window.clearTimeout(timer.current);
  }, [open]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function commit(values: T) {
    if (phase === "done") return;
    setPhase("done");
    timer.current = window.setTimeout(() => onSubmit(values), SWAP_MS);
  }

  return { phase, commit };
}

const CTA_CLASS =
  "h-11 font-display text-xs font-medium tracking-[0.14em] uppercase";

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
              { id: "idle", label: "Salva", icon: <Check className="h-4 w-4" />, ariaLabel: "Salva" },
              { id: "done", label: "Salvato", icon: <Check className="h-4 w-4" />, ariaLabel: "Salvato" },
            ]
          : [
              { id: "idle", label: "Aggiungi", icon: <Plus className="h-4 w-4" />, ariaLabel: "Aggiungi" },
              { id: "done", label: "Aggiunta", icon: <Check className="h-4 w-4" />, ariaLabel: "Aggiunta" },
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
