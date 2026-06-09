"use client";

import { useState, useEffect, useRef } from "react";
import { FolderOpen, Plus, ChevronDown, Check, Pencil, Trash2, X } from "lucide-react";
import {
  listProjects,
  createProject,
  setActiveProject,
  getActiveProject,
  deleteProject,
  updateProject,
  clearActiveProject,
  type AIProject,
} from "@/lib/projects/project-manager";

export function ProjectSwitcher() {
  const [open, setOpen]             = useState(false);
  const [projects, setProjects]     = useState<AIProject[]>([]);
  const [active, setActive]         = useState<AIProject | null>(null);
  const [creating, setCreating]     = useState(false);
  const [newName, setNewName]       = useState("");
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editName, setEditName]     = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Carica dati ────────────────────────────────────────────────────────────
  function reload() {
    setProjects(listProjects());
    setActive(getActiveProject());
  }

  useEffect(() => {
    reload();
  }, []);

  // Chiudi dropdown al click fuori
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setEditingId(null);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleSelect(id: string) {
    setActiveProject(id);
    reload();
    setOpen(false);
  }

  function handleClearActive() {
    clearActiveProject();
    reload();
    setOpen(false);
  }

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    createProject(name);
    reload();
    setNewName("");
    setCreating(false);
    setOpen(false);
  }

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Eliminare il progetto e tutti i suoi dati?")) return;
    deleteProject(id);
    reload();
  }

  function handleEditSave(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const name = editName.trim();
    if (!name) return;
    updateProject(id, { name });
    reload();
    setEditingId(null);
  }

  function startEdit(p: AIProject, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(p.id);
    setEditName(p.name);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:bg-black/5"
        style={{ color: active ? "#0D1016" : "rgba(0,0,0,0.4)", maxWidth: 160 }}
        title={active ? active.name : "Nessun progetto selezionato"}
      >
        <FolderOpen className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate max-w-[100px]">
          {active ? active.name : "Progetto"}
        </span>
        <ChevronDown className="h-3 w-3 flex-shrink-0 opacity-50" />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-64 rounded-xl shadow-xl border z-50 overflow-hidden"
          style={{
            background: "#fff",
            borderColor: "rgba(0,0,0,0.08)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
          }}
        >
          {/* Header */}
          <div
            className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: "rgba(0,0,0,0.35)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}
          >
            Progetti AI
          </div>

          {/* Nessun progetto */}
          {projects.length === 0 && !creating && (
            <div className="px-3 py-4 text-center text-[11px]" style={{ color: "rgba(0,0,0,0.35)" }}>
              Nessun progetto. Creane uno per separare i dati dei tuoi sistemi AI.
            </div>
          )}

          {/* Lista progetti */}
          <div className="max-h-48 overflow-y-auto">
            {/* Opzione: nessun progetto */}
            {projects.length > 0 && (
              <button
                onClick={handleClearActive}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-left hover:bg-black/4 transition-colors"
                style={{ color: "rgba(0,0,0,0.4)" }}
              >
                <span className="w-3.5" />
                <span className="italic">Nessun progetto (globale)</span>
                {!active && <Check className="h-3 w-3 ml-auto" style={{ color: "#16a34a" }} />}
              </button>
            )}

            {projects.map((p) => (
              <div
                key={p.id}
                className="group flex items-center gap-1 px-3 py-2 hover:bg-black/4 transition-colors cursor-pointer"
                onClick={() => handleSelect(p.id)}
              >
                {editingId === p.id ? (
                  <>
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEditSave(p.id, e as unknown as React.MouseEvent);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 border rounded px-1.5 py-0.5 text-[11px] outline-none"
                      style={{ borderColor: "rgba(0,0,0,0.15)" }}
                    />
                    <button onClick={(e) => handleEditSave(p.id, e)} className="text-green-600 hover:opacity-70 p-0.5">
                      <Check className="h-3 w-3" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="opacity-40 hover:opacity-70 p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-[11px] font-medium truncate" style={{ color: "#0D1016" }}>
                      {p.name}
                    </span>
                    {active?.id === p.id && (
                      <Check className="h-3 w-3 flex-shrink-0" style={{ color: "#16a34a" }} />
                    )}
                    <button
                      onClick={(e) => startEdit(p, e)}
                      className="opacity-0 group-hover:opacity-40 hover:!opacity-70 p-0.5 transition-opacity"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(p.id, e)}
                      className="opacity-0 group-hover:opacity-40 hover:!opacity-70 p-0.5 transition-opacity"
                      style={{ color: "#dc2626" }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Crea nuovo */}
          <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            {creating ? (
              <div className="px-3 py-2 flex items-center gap-1.5">
                <input
                  autoFocus
                  placeholder="Nome sistema AI…"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") { setCreating(false); setNewName(""); }
                  }}
                  className="flex-1 border rounded-lg px-2 py-1 text-[11px] outline-none"
                  style={{ borderColor: "rgba(0,0,0,0.15)" }}
                />
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="text-[11px] font-medium px-2 py-1 rounded-lg disabled:opacity-30 transition-opacity"
                  style={{ background: "#0D1016", color: "#fff" }}
                >
                  Crea
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-medium hover:bg-black/4 transition-colors"
                style={{ color: "#0D1016" }}
              >
                <Plus className="h-3.5 w-3.5" />
                Nuovo progetto
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
