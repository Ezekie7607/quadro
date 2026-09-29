import { Link } from "@tanstack/react-router";
import { UsersRound } from "lucide-react";
import { motion } from "motion/react";
import type { ClientRow } from "@/lib/chart-data";
import { EASE_OUT } from "@/lib/ease";
import type { Space } from "@/lib/spaces-store";
import { useQuietMotion } from "@/lib/use-quiet-motion";
import { cn, formatEuro, pluralizeOfferte } from "@/lib/utils";

/**
 * Euro per client across every pipeline: won in solid ink, still open in the
 * same ink striped. Bars share one scale, the biggest client at full width.
 */
export function ClientChart({
  rows,
  space,
  className,
}: {
  rows: ClientRow[];
  space?: Space;
  className?: string;
}) {
  const quiet = useQuietMotion();
  const peak = Math.max(1, ...rows.map((row) => row.won + row.open));
  const won = rows.reduce((sum, row) => sum + row.won, 0);
  const total = rows.reduce((sum, row) => sum + row.won + row.open, 0);

  function barTransition(index: number, delay = 0) {
    return quiet
      ? { duration: 0 }
      : { duration: 0.55, ease: EASE_OUT, delay: delay + index * 0.05 };
  }

  return (
    <section
      aria-labelledby="client-chart-title"
      className={cn("flex flex-col rounded-3xl bg-surface p-3 sm:p-4", className)}
    >
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2
            id="client-chart-title"
            className="flex items-center gap-2 font-display text-sm font-medium tracking-[0.08em] uppercase"
          >
            <UsersRound className="size-3.5" aria-hidden="true" />
            Clienti
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {total > 0
              ? `${formatEuro(won)} vinti su ${formatEuro(total)}`
              : "Euro per cliente, vinti e aperti"}
          </p>
        </div>
        {space ? (
          <Link
            to="/spazio/$spaceId"
            params={{ spaceId: space.id }}
            className="font-display text-xs tracking-[0.12em] text-muted-foreground uppercase hover:text-foreground"
          >
            Apri
          </Link>
        ) : null}
      </header>

      <div className="flex flex-1 flex-col rounded-2xl bg-card p-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ancora nessuna offerta.</p>
        ) : (
          <>
            <ul className="grid gap-3">
              {rows.map((row, index) => {
                const rowTotal = row.won + row.open;
                const openEnd = (rowTotal / peak) * 100;
                const wonEnd = (row.won / peak) * 100;
                return (
                  <li key={row.key}>
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate text-sm text-foreground">{row.label}</p>
                      <p className="shrink-0 font-display text-xs tracking-wide tabular-nums">
                        {formatEuro(rowTotal)}
                      </p>
                    </div>
                    <div
                      role="img"
                      aria-label={`${row.label}: ${formatEuro(row.won)} vinti, ${formatEuro(row.open)} aperti`}
                      className="relative h-2.5 overflow-hidden rounded-full bg-background"
                    >
                      {row.open > 0 ? (
                        <motion.span
                          className="chart-hatch absolute inset-0"
                          initial={quiet ? false : { clipPath: "inset(0% 100% 0% 0% round 999px)" }}
                          animate={{ clipPath: `inset(0% ${100 - openEnd}% 0% 0% round 999px)` }}
                          transition={barTransition(index, 0.08)}
                        />
                      ) : null}
                      {row.won > 0 ? (
                        <motion.span
                          className="absolute inset-0 bg-foreground"
                          initial={quiet ? false : { clipPath: "inset(0% 100% 0% 0% round 999px)" }}
                          animate={{ clipPath: `inset(0% ${100 - wonEnd}% 0% 0% round 999px)` }}
                          transition={barTransition(index)}
                        />
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pluralizeOfferte(row.deals)}
                      {row.won > 0 ? ` · ${formatEuro(row.won)} vinti` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
            <p
              aria-hidden="true"
              className="mt-auto flex items-center gap-4 pt-4 text-xs text-muted-foreground"
            >
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-foreground" />
                Vinti
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="chart-hatch size-2.5 rounded-full" />
                Aperti
              </span>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
