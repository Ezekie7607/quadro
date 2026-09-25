import { useCallback, useEffect, useState } from "react";

export function useSelection() {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(new Set());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectMany = useCallback((ids: string[]) => {
    setSelected(new Set(ids));
  }, []);

  const addMany = useCallback((ids: string[]) => {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const remove = useCallback((ids: string[]) => {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) next.delete(id);
      return next;
    });
  }, []);

  const setGroup = useCallback((ids: string[], checked: boolean) => {
    if (checked) {
      setSelected((current) => {
        const next = new Set(current);
        for (const id of ids) next.add(id);
        return next;
      });
      return;
    }
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) next.delete(id);
      return next;
    });
  }, []);

  return { selected, toggle, selectMany, addMany, clear, remove, setGroup };
}

export function groupCheckState(ids: string[], selected: Set<string>) {
  let count = 0;
  for (const id of ids) {
    if (selected.has(id)) count += 1;
  }
  return {
    checked: ids.length > 0 && count === ids.length,
    indeterminate: count > 0 && count < ids.length,
    disabled: ids.length === 0,
  };
}
