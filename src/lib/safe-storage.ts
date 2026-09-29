import type { StateStorage } from "zustand/middleware";
import { toast } from "sonner";

const WARN_EVERY_MS = 10_000;
let lastWarning = 0;

const BANNER_ID = "quadro-storage-warning";

/** A plain, dismissible notice for when "Avvisi" is off and no toaster is mounted. */
function showBanner(message: string) {
  let banner = document.getElementById(BANNER_ID);
  if (!banner) {
    banner = document.createElement("div");
    banner.id = BANNER_ID;
    banner.setAttribute("role", "alert");
    banner.className =
      "fixed inset-x-3 bottom-3 z-[100] mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm text-foreground shadow-card-hover";
    const text = document.createElement("p");
    text.className = "min-w-0 flex-1";
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Chiudi";
    close.className = "shrink-0 font-display text-xs tracking-[0.14em] uppercase";
    close.addEventListener("click", () => document.getElementById(BANNER_ID)?.remove());
    banner.append(text, close);
    document.body.append(banner);
  }
  const text = banner.querySelector("p");
  if (text) text.textContent = message;
}

function warnNotSaved() {
  const now = Date.now();
  if (now - lastWarning < WARN_EVERY_MS) return;
  lastWarning = now;
  const message =
    "Il browser non ha più spazio: le ultime modifiche restano solo finché la pagina è aperta. Esporta una copia dalle Impostazioni.";
  // Out of the store write that failed (it can run mid-drag), and never a
  // blocking alert. A lost change is said even with "Avvisi" off.
  window.setTimeout(() => {
    if (document.querySelector("[data-sonner-toaster]")) toast.error(message);
    else showBanner(message);
  }, 0);
}

const serverStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

/**
 * localStorage for the persisted stores. A refused write (storage full,
 * private mode) used to throw inside the click that caused it: the change
 * stayed on screen, vanished on reload, and nothing said so.
 */
export function quadroStorage(): StateStorage {
  if (typeof window === "undefined") return serverStorage;
  return {
    getItem: (name) => {
      try {
        return window.localStorage.getItem(name);
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      try {
        window.localStorage.setItem(name, value);
      } catch {
        warnNotSaved();
      }
    },
    removeItem: (name) => {
      try {
        window.localStorage.removeItem(name);
      } catch {
        // Nothing to undo: the key stays as it was.
      }
    },
  };
}
