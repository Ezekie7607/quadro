import { TextScramble } from "@/components/motion/text-scramble";
import { cn } from "@/lib/utils";

type SplitHeadlineProps = {
  lines: string[];
  className?: string;
};

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
            <TextScramble text={line} playOnMount duration={720 + index * 90} />
          </span>
        </span>
      ))}
    </h1>
  );
}
