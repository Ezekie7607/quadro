import { Search, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  id = "quadro-search",
  maxLength,
  icon: Icon = Search,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  id?: string;
  maxLength?: number;
  /** The leading glyph; a capture field is not a search and should not look like one. */
  icon?: LucideIcon;
}) {
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <Icon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-full border-transparent bg-muted pl-11 focus-visible:border-ring"
      />
    </label>
  );
}
