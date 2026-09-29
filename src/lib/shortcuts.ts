// A dialog playing its close animation is still in the DOM; only an open one counts.
const OPEN_DIALOG =
  '[data-slot="dialog-content"][data-state="open"], [data-slot="alert-dialog-content"][data-state="open"]';
const OPEN_PALETTE = '[data-slot="command-palette"]';

export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const field =
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT";
  // A dialog playing its close animation keeps focus in its field for a few
  // hundred ms; a key pressed then (⌘K right after Esc) is not typing.
  return field && !target.closest('[data-state="closed"]');
}

export function isDialogOpen() {
  return document.querySelector(OPEN_DIALOG) !== null;
}

export function isPaletteOpen() {
  return document.querySelector(OPEN_PALETTE) !== null;
}

/**
 * Whether a global shortcut must stand down for this key press (§12): while
 * someone types in a field, while a dialog or the palette is open, or on an
 * auto-repeat. The "Scorciatoie" setting is checked by each listener, which
 * simply is not registered when it is off.
 */
export function isShortcutBlocked(event: KeyboardEvent) {
  return event.repeat || isTypingTarget(event.target) || isDialogOpen() || isPaletteOpen();
}
