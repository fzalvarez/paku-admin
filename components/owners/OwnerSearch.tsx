"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchOwners, type OwnerSearchResult } from "@/lib/services/petRecords";

// Combobox para buscar un cliente (dueño de mascotas) por nombre o apellido.
// Llama a onSelect con el cliente elegido, o con null al limpiar la búsqueda.
export function OwnerSearch({
  onSelect,
  label = "Buscar dueño",
}: {
  onSelect: (owner: OwnerSearchResult | null) => void;
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OwnerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected] = useState<OwnerSearchResult | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Con un cliente elegido, el input muestra su nombre: no se vuelve a buscar.
    if (selected) return;
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await searchOwners(query.trim()));
        setDropdownOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, selected]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const select = (owner: OwnerSearchResult) => {
    setSelected(owner);
    setQuery(`${owner.first_name} ${owner.last_name}`);
    setDropdownOpen(false);
    onSelect(owner);
  };

  const clear = () => {
    setSelected(null);
    setQuery("");
    setResults([]);
    onSelect(null);
  };

  return (
    <>
      <Label className="mb-1 block">{label}</Label>
      <div className="relative max-w-md" ref={boxRef}>
        <Input
          placeholder="Nombre o apellido (mínimo 3 letras)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          onFocus={() => results.length > 0 && setDropdownOpen(true)}
        />
        {selected && (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            onClick={clear}
          >
            ✕
          </button>
        )}
        {dropdownOpen && (
          <div className="absolute z-30 mt-1 w-full max-h-72 overflow-auto rounded-lg border bg-popover shadow-lg">
            {searching && <div className="px-3 py-2 text-sm text-muted-foreground">Buscando…</div>}
            {!searching && query.trim().length >= 3 && results.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</div>
            )}
            {!searching &&
              results.map((o) => (
                <button
                  type="button"
                  key={o.id}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => select(o)}
                >
                  <div className="font-medium text-popover-foreground">
                    {o.first_name} {o.last_name}
                  </div>
                  <div className="text-xs text-muted-foreground">{o.phone || o.email}</div>
                </button>
              ))}
          </div>
        )}
      </div>
    </>
  );
}
