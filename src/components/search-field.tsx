import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  id = "quadro-search",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  id?: string;
}) {
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-full border-transparent bg-muted pl-11 focus-visible:border-ring"
      />
    </label>
  );
}
