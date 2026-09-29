import type { Announcements, ScreenReaderInstructions } from "@dnd-kit/core";

/**
 * Screen-reader text for dragging, in Italian. dnd-kit's defaults are English
 * and read out internal ids ("Picked up draggable item 3f2a…").
 * `noun` is feminine singular ("scheda", "offerta"); `group` / `groups` name
 * the columns ("colonna" / "colonne", "fase" / "fasi"); `where` gives the
 * title of the column an id belongs to, or null.
 */
export function dndAccessibility({
  noun,
  group,
  groups,
  where,
}: {
  noun: string;
  group: string;
  groups: string;
  where: (id: string) => string | null;
}): { announcements: Announcements; screenReaderInstructions: ScreenReaderInstructions } {
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1);
  const titleOf = (over: { id: string | number } | null) => (over ? where(String(over.id)) : null);
  return {
    screenReaderInstructions: {
      draggable: `Per spostare la ${noun} premi spazio o invio, poi usa le frecce. Premi di nuovo spazio o invio per lasciarla, Esc per annullare.`,
    },
    announcements: {
      onDragStart: () => `${Noun} presa.`,
      onDragOver: ({ over }) => {
        const title = titleOf(over);
        return title ? `Sopra la ${group} ${title}.` : `Fuori dalle ${groups}.`;
      },
      onDragEnd: ({ over }) => {
        const title = titleOf(over);
        return title ? `${Noun} lasciata nella ${group} ${title}.` : `${Noun} lasciata.`;
      },
      onDragCancel: () => `Spostamento annullato: la ${noun} torna al suo posto.`,
    },
  };
}
