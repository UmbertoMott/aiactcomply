"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { COUNTRIES, flagEmoji } from "@/lib/countries";

const MONO = "'DM Mono', monospace";

type Props = {
  value: string;                    // nome paese selezionato
  onChange: (name: string) => void;
  placeholder?: string;
};

/**
 * Dropdown paese custom (la scheda di ricerca la offriamo noi, non il sistema
 * operativo). Bandierina + nome, campo di ricerca interno, lista filtrabile.
 */
export default function CountrySelect({ value, onChange, placeholder = "Seleziona…" }: Props) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => COUNTRIES.find((c) => c.name === value) ?? null,
    [value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  // Chiudi su click esterno
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Focus sul campo ricerca all'apertura (solo effetto DOM, nessun setState)
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const openMenu = () => {
    setQuery("");
    setActive(0);
    setOpen(true);
  };

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[active]) pick(filtered[active].name);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          fontSize: 14,
          textAlign: "left",
          color: selected ? "#0D1016" : "rgba(0,0,0,0.4)",
          background: "#ffffff",
          border: `1px solid ${open ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.14)"}`,
          borderRadius: 9,
          cursor: "pointer",
          outline: "none",
        }}
      >
        {selected && <span style={{ fontSize: 17, lineHeight: 1 }}>{flagEmoji(selected.code)}</span>}
        <span style={{ flex: 1 }}>{selected ? selected.name : placeholder}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>
          <path d="M6 9l6 6 6-6" stroke="rgba(0,0,0,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          right: 0,
          zIndex: 50,
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 12,
          boxShadow: "0 16px 44px rgba(0,0,0,0.16)",
          overflow: "hidden",
        }}>
          {/* Campo ricerca (nostro) */}
          <div style={{ padding: 10, borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#fafaf9", borderRadius: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="rgba(0,0,0,0.4)" strokeWidth="1.8" />
                <path d="M20 20l-3.2-3.2" stroke="rgba(0,0,0,0.4)" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                onKeyDown={onKeyDown}
                placeholder="Cerca un paese…"
                style={{
                  flex: 1, border: "none", outline: "none", background: "transparent",
                  fontSize: 13, color: "#0D1016",
                }}
              />
            </div>
          </div>

          {/* Lista */}
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <p style={{ padding: "16px", fontSize: 13, color: "rgba(0,0,0,0.4)", textAlign: "center" }}>
                Nessun paese trovato
              </p>
            ) : (
              filtered.map((c, i) => {
                const isActive = i === active;
                const isSel = selected?.code === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(c.name)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      padding: "9px 14px",
                      fontSize: 14,
                      textAlign: "left",
                      color: "#0D1016",
                      background: isActive ? "#f2f2f0" : "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: 17, lineHeight: 1 }}>{flagEmoji(c.code)}</span>
                    <span style={{ flex: 1 }}>{c.name}</span>
                    {isSel && (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12.5l4.5 4.5L19 7.5" stroke="#0B3D2E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div style={{ padding: "8px 14px", borderTop: "1px solid rgba(0,0,0,0.07)", fontFamily: MONO, fontSize: 10, color: "rgba(0,0,0,0.3)" }}>
            {filtered.length} paesi
          </div>
        </div>
      )}
    </div>
  );
}
