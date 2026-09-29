"use client";

import {
  Plus,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useQuietMotion } from "@/lib/use-quiet-motion";
import { type ComponentType, useEffect, useId, useRef, useState } from "react";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type BloomMenuItem = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const SPRING_FOLDER = {
  type: "spring",
  stiffness: 300,
  damping: 32,
  mass: 0.9,
} as const;

export interface BloomMenuProps {
  items: BloomMenuItem[];
  onSelect?: (item: BloomMenuItem) => void;
  triggerLabel?: string;
  menuTitle?: string;
  closeLabel?: string;
  align?: "center" | "end";
  className?: string;
}

export function BloomMenu({
  items,
  onSelect,
  triggerLabel = "Nuova",
  menuTitle = "Nuova scheda",
  closeLabel = "Chiudi menu",
  align = "end",
  className,
}: BloomMenuProps) {
  const [open, setOpen] = useState(false);
  const reduce = useQuietMotion();
  const layoutId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const morph = reduce ? { duration: 0.15 } : SPRING_FOLDER;

  return (
    <div ref={ref} className={cn("relative inline-flex w-full sm:w-auto", className)}>
      <div className="h-11 w-full sm:w-36" aria-hidden />

      <div
        className={cn(
          // Full row width on phones so the trigger lines up with the field above it.
          "pointer-events-none absolute top-1/2 z-40 grid h-[300px] w-full -translate-y-1/2 place-items-center sm:w-[min(86vw,420px)] [&>*]:pointer-events-auto",
          align === "end"
            ? "right-0 translate-x-0"
            : "left-1/2 -translate-x-1/2",
        )}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {open ? (
            <motion.div
              key="panel"
              layoutId={layoutId}
              transition={morph}
              style={{ borderRadius: 24 }}
              className="w-[min(86vw,420px)] overflow-hidden border border-border bg-card shadow-lift"
            >
              <motion.div
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reduce ? 0 : 0.12, duration: 0.2 }}
              >
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <span className="font-display text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    {menuTitle}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label={closeLabel}
                    className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <motion.div
                  initial={reduce ? false : { clipPath: "inset(45% 34% 45% 34%)" }}
                  animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
                  transition={{
                    delay: reduce ? 0 : 0.08,
                    duration: 0.45,
                    ease: EASE_OUT,
                  }}
                  className="grid grid-cols-3"
                >
                  {items.map((item, i) => {
                    const cols = 3;
                    const rows = Math.ceil(items.length / cols);
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    const dist = Math.hypot(
                      col - (cols - 1) / 2,
                      row - (rows - 1) / 2,
                    );
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelect?.(item);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex items-center justify-center px-3 py-6 text-muted-foreground transition-colors hover:text-foreground",
                          i % 3 !== 2 && "border-r border-border",
                          i < items.length - (items.length % 3 || 3) && "border-b border-border",
                        )}
                      >
                        <motion.span
                          initial={
                            reduce
                              ? { opacity: 0 }
                              : { opacity: 0, scale: 0.85, filter: "blur(6px)" }
                          }
                          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                          transition={{
                            delay: reduce ? 0 : 0.1 + dist * 0.07,
                            type: "spring",
                            stiffness: 440,
                            damping: 34,
                          }}
                          className="flex flex-col items-center gap-2"
                        >
                          <item.icon className="h-5 w-5" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </motion.span>
                      </button>
                    );
                  })}
                </motion.div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.button
              key="trigger"
              type="button"
              layoutId={layoutId}
              transition={morph}
              style={{ borderRadius: 9999 }}
              onClick={() => setOpen(true)}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label={triggerLabel}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              className="btn-sheen relative inline-flex h-11 w-full items-center justify-center overflow-hidden bg-primary px-4 font-display text-xs font-medium tracking-[0.14em] text-primary-foreground uppercase sm:w-36"
            >
              <motion.span
                layout
                className="inline-flex items-center gap-2 whitespace-nowrap"
              >
                {triggerLabel}
                <Plus className="h-4 w-4" />
              </motion.span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
