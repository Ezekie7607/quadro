import { motion, useReducedMotion } from "motion/react";
import { APP_NAME } from "@/lib/brand";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { x: 6.5, h: 15.5, delay: 0 },
  { x: 13.5, h: 10, delay: 0.06 },
  { x: 20.5, h: 13, delay: 0.12 },
] as const;

type QuadroMarkProps = {
  className?: string;
  animate?: boolean;
  title?: string;
};

export function QuadroMark({ className, animate = false, title = APP_NAME }: QuadroMarkProps) {
  const reduce = useReducedMotion() ?? false;
  const play = animate && !reduce;

  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label={title}
      className={cn("size-8 shrink-0 text-foreground", className)}
    >
      <title>{title}</title>
      <rect width="32" height="32" rx="9" fill="currentColor" />
      {COLUMNS.map((column) => {
        const y = 24 - column.h;
        if (!play) {
          return (
            <rect
              key={column.x}
              x={column.x}
              y={y}
              width="5"
              height={column.h}
              rx="1.6"
              className="fill-background"
            />
          );
        }
        return (
          <motion.rect
            key={column.x}
            x={column.x}
            width="5"
            rx="1.6"
            className="fill-background"
            initial={{ height: 3, y: 21 }}
            animate={{ height: column.h, y }}
            transition={{ ...SPRING_LAYOUT, delay: column.delay }}
          />
        );
      })}
    </svg>
  );
}

export function QuadroWordmark({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <QuadroMark className={markClassName} animate />
      <span className="font-display text-lg font-medium tracking-wide uppercase">{APP_NAME}</span>
    </span>
  );
}
