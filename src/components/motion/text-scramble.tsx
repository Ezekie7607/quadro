"use client";

import { useQuietMotion } from "@/lib/use-quiet-motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@$?/";

export interface TextScrambleProps {
  text: string;
  duration?: number;
  glyphs?: string;
  playOnMount?: boolean;
  className?: string;
  style?: CSSProperties;
}

function fillGlyphs(text: string, glyphs: string) {
  return text
    .split("")
    .map((character) => (character === " " ? " " : glyphs[Math.floor(Math.random() * glyphs.length)] ?? character))
    .join("");
}

export function TextScramble({
  text,
  duration,
  glyphs = DEFAULT_GLYPHS,
  playOnMount = false,
  className,
  style,
}: TextScrambleProps) {
  const reduce = useQuietMotion();
  const [display, setDisplay] = useState(text);
  const mounted = useRef(false);
  const reduceRef = useRef(reduce);
  reduceRef.current = reduce;

  useEffect(() => {
    const isFirst = !mounted.current;
    mounted.current = true;

    if (isFirst && !playOnMount) {
      setDisplay(text);
      return;
    }

    if (reduceRef.current || !glyphs) {
      setDisplay(text);
      return;
    }

    const characters = text.split("");
    const startedAt = performance.now();
    const animationDuration = duration ?? Math.min(760, Math.max(420, characters.length * 32));
    let frame = 0;
    let lastUpdate = 0;
    setDisplay(fillGlyphs(text, glyphs));

    const animate = (now: number) => {
      if (now - lastUpdate >= 40) {
        lastUpdate = now;
        const progress = Math.min((now - startedAt) / animationDuration, 1);
        const settled = Math.floor(progress * characters.length);
        setDisplay(
          characters
            .map((character, index) => {
              if (index < settled || character === " ") return character;
              return glyphs[Math.floor(Math.random() * glyphs.length)] ?? character;
            })
            .join(""),
        );
      }

      if (now - startedAt < animationDuration) {
        frame = requestAnimationFrame(animate);
      } else {
        setDisplay(text);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [duration, glyphs, playOnMount, text]);

  return (
    <span className={cn("inline-block whitespace-pre", className)} style={style}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{reduce ? text : display}</span>
    </span>
  );
}
