import { cn } from "@/lib/utils";

type SplitHeadlineProps = {
  lines: string[];
  className?: string;
};

/**
 * Page title: two lines that rise in (`split-line`, CSS), inverting on hover.
 * No scramble here — the brief keeps that for the menu labels (§15), where the
 * "Scrittura in scramble" and "Calmo" settings already govern it.
 */
export function SplitHeadline({ lines, className }: SplitHeadlineProps) {
  return (
    <h1 className={cn("split-hero", className)}>
      {lines.map((line, index) => (
        <span
          key={`${line}-${index}`}
          className="split-line-wrap"
          style={{ animationDelay: `${80 + index * 90}ms` }}
        >
          <span
            className="split-line invert-word"
            style={{ animationDelay: `${80 + index * 90}ms` }}
          >
            {line}
          </span>
        </span>
      ))}
    </h1>
  );
}
