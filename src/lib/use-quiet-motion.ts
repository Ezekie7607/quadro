import { useSyncExternalStore } from "react";
import { useSettingsStore } from "@/lib/settings-store";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

const getSnapshot = () => window.matchMedia(QUERY).matches;
// The server cannot know; hydration starts from "full" and corrects itself
// right after, so server and client markup always agree.
const getServerSnapshot = () => false;

/**
 * True when motion should stay quiet: the system asks for reduced motion, or
 * the studio's "Movimento" is set to "Calmo". Motion's own `useReducedMotion`
 * only knows the first half, which is why Calmo used to reach almost nothing.
 */
export function useQuietMotion() {
  const system = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const calm = useSettingsStore((s) => s.motion === "reduce");
  return system || calm;
}
