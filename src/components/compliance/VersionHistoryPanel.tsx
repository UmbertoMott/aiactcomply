"use client";

import { useState, useEffect, useRef } from "react";
import {
  History, RotateCcw, ChevronDown, ChevronUp,
  Tag, FileCheck, AlertTriangle, Edit3, Check, X, Trash2, Clock,
} from "lucide-react";
import {
  listVersions, updateVersionNote, updateVersionTag, clearVersions, deleteVersion,
  type VersionSnapshot,
} from "@/lib/projects/version-history";

interface VersionHistoryPanelProps {
  toolId:    string;
  onRestore: (data: unknown) => void;
  /** Sezioni disponibili per leggere i label nell'UI diff */
  sectionLabels?: Record<string, string>;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH   = Math.floor(diffMs / 3600000);
    const diffD   = Math.floor(diffMs / 86400000);
    if (diffMin < 2)  return "Adesso";
    if (diffMin < 60) return `${diffMin} min fa`;
    if (diffH < 24)   return `${diffH}h fa`;
    if (diffD < 7)    return `${diffD}g fa`;
    return d.toLocaleString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatFull(iso: string): string {
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch { return iso; }
}

const STATUS_CFG = {
  finalized: { label: "Finalizzata", bg: "rgba(21,128,61,0.08)", color: "#15803d", border: "rgba(21,128,61,0.2)" },
  draft:     { label: "Bozza",       bg: "rgba(37,99,235,0.07)", color: "#2563eb", border: "rgba(37,99,235,0.2)" },
} as const;

function VersionRow({
  v, i, toolId, onRestore, sectionLabels, onUpdated, onDeleted,
}: {
  v: VersionSnapshot; i: number; toolId: string;
  onRestore: (data: unknown) => void;
  sectionLabels?: Record<string, string>;
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const [expanded,       setExpanded]       = useState(false);
  const [editingNote,    setEditingNote]    = useState(false);
  const [editingTag,     setEditingTag]     = useState(false);
  const [noteVal,        setNoteVal]        = useState(v.note ?? "");
  const [tagVal,         setTagVal]         = useState(v.tag ?? "");
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const tagRef  = useRef<HTMLInputElement>(null);

  const statusCfg = STATUS_CFG[v.status ?? "draft"];
  const isFirst   = i === 0;

  function saveNote() {
    updateVersionNote(toolId, v.id, noteVal);
    setEditingNote(false);
    onUpdated();
  }
  function saveTag() {
    updateVersionTag(toolId, v.id, tagVal.trim() || (v.tag ?? ""));
    setEditingTag(false);
    onUpdated();
  }

  return (
    <div style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
      {/* Main row */}
      <div
        className="flex items-start gap-3 px-4 py-3 hover:bg-black/[0.015] transition-colors cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Timeline dot */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 2 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
            background: isFirst ? "#0D1016" : v.status === "finalized" ? "#15803d" : "#2563eb",
            border: `2px solid ${isFirst ? "#0D1016" : v.status === "finalized" ? "rgba(21,128,61,0.4)" : "rgba(37,99,235,0.4)"}`,
            boxShadow: isFirst ? "0 0 0 3px rgba(13,16,22,0.08)" : "none",
          }} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {/* Tag */}
            {editingTag ? (
              <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                <input ref={tagRef} value={tagVal} onChange={e => setTagVal(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveTag(); if (e.key === "Escape") setEditingTag(false); }}
                  autoFocus
                  style={{ fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 4, border: "1px solid rgba(0,0,0,0.2)", color: "#0D1016", width: 80 }} />
                <button onClick={saveTag} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><Check size={12} color="#15803d" /></button>
                <button onClick={() => setEditingTag(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><X size={12} color="#dc2626" /></button>
              </div>
            ) : (
              <span
                style={{ fontSize: 11, fontWeight: 700, color: isFirst ? "#0D1016" : "rgba(0,0,0,0.6)" }}
                onDoubleClick={e => { e.stopPropagation(); setEditingTag(true); setTimeout(() => tagRef.current?.focus(), 50); }}>
                {v.tag ?? `v?`}
                <span style={{ fontSize: 9, color: "rgba(0,0,0,0.3)", marginLeft: 3, fontWeight: 400 }}>
                  (doppio clic per rinominare)
                </span>
              </span>
            )}

            {/* Status badge */}
            <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
              background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}>
              {statusCfg.label}
            </span>

            {/* Substantial modification badge */}
            {v.isSubstantialModification && (
              <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
                background: "rgba(220,38,38,0.07)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.2)",
                display: "flex", alignItems: "center", gap: 3 }}>
                <AlertTriangle size={9} /> Modifica sostanziale
              </span>
            )}

            {/* Sections changed badge */}
            {v.sectionsChanged && v.sectionsChanged.length > 0 && (
              <span style={{ fontSize: 9, color: "rgba(0,0,0,0.4)", padding: "1px 6px", borderRadius: 4,
                background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)" }}>
                {v.sectionsChanged.length} sezioni modificate
              </span>
            )}

            {isFirst && (
              <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
                background: "rgba(13,16,22,0.06)", color: "rgba(0,0,0,0.5)" }}>
                Corrente
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
            <Clock size={10} color="rgba(0,0,0,0.3)" />
            <span style={{ fontSize: 10, color: "rgba(0,0,0,0.35)" }} title={formatFull(v.savedAt)}>
              {formatDate(v.savedAt)}
            </span>
            {v.systemName && (
              <span style={{ fontSize: 10, color: "rgba(0,0,0,0.3)" }}>· {v.systemName}</span>
            )}
          </div>

          {/* Note preview */}
          {v.note && !editingNote && (
            <p style={{ fontSize: 10, color: "rgba(0,0,0,0.45)", marginTop: 3, fontStyle: "italic" }}>
              &quot;{v.note}&quot;
            </p>
          )}
        </div>

        {/* Actions: delete + expand chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, paddingTop: 2 }}>
          <button
            onClick={e => { e.stopPropagation(); setConfirmDelete(true); setExpanded(true); }}
            title="Elimina questa versione"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "1px 3px",
              color: "rgba(0,0,0,0.2)", borderRadius: 4, display: "flex", alignItems: "center" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#dc2626")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(0,0,0,0.2)")}>
            <Trash2 size={12} />
          </button>
          <div style={{ color: "rgba(0,0,0,0.25)" }}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ paddingLeft: 40, paddingRight: 16, paddingBottom: 12, background: "rgba(0,0,0,0.012)" }}>

          {/* Substantial modification detail */}
          {v.isSubstantialModification && v.substModificationBasis && (
            <div style={{ marginBottom: 8, padding: "6px 10px", borderRadius: 7,
              background: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.15)" }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "#dc2626", marginBottom: 2 }}>⚠ Modifica sostanziale — Art. 6(3) AI Act</p>
              <p style={{ fontSize: 10, color: "rgba(0,0,0,0.5)", lineHeight: 1.5 }}>{v.substModificationBasis}</p>
            </div>
          )}

          {/* Sections changed diff */}
          {v.sectionsChanged && v.sectionsChanged.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", marginBottom: 4 }}>Sezioni modificate rispetto alla versione precedente:</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {v.sectionsChanged.map(s => (
                  <span key={s} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4,
                    background: "rgba(37,99,235,0.07)", color: "#2563eb", border: "1px solid rgba(37,99,235,0.15)" }}>
                    {sectionLabels?.[s] ?? s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Note editing */}
          <div style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", marginBottom: 3 }}>Nota:</p>
            {editingNote ? (
              <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 6 }}>
                <textarea ref={noteRef} value={noteVal} onChange={e => setNoteVal(e.target.value)}
                  rows={2} autoFocus placeholder="Es. Aggiornato dopo revisione DPO del 10/06…"
                  style={{ flex: 1, fontSize: 11, padding: "5px 8px", borderRadius: 6,
                    border: "1px solid rgba(0,0,0,0.15)", resize: "none", fontFamily: "inherit" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <button onClick={saveNote} style={{ padding: "4px 8px", borderRadius: 5, background: "#0D1016", color: "#fff", border: "none", fontSize: 10, cursor: "pointer" }}>Salva</button>
                  <button onClick={() => setEditingNote(false)} style={{ padding: "4px 8px", borderRadius: 5, background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.5)", border: "none", fontSize: 10, cursor: "pointer" }}>Annulla</button>
                </div>
              </div>
            ) : (
              <button onClick={e => { e.stopPropagation(); setEditingNote(true); setTimeout(() => noteRef.current?.focus(), 50); }}
                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "rgba(0,0,0,0.4)",
                  background: "none", border: "1px dashed rgba(0,0,0,0.15)", borderRadius: 5, padding: "3px 8px", cursor: "pointer" }}>
                <Edit3 size={10} /> {v.note ? "Modifica nota" : "Aggiungi nota"}
              </button>
            )}
          </div>

          {/* Delete confirm */}
          {confirmDelete && (
            <div style={{ marginBottom: 8, padding: "8px 10px", borderRadius: 7, display: "flex", alignItems: "center", gap: 8,
              background: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.2)" }}>
              <Trash2 size={11} color="#dc2626" />
              <span style={{ fontSize: 10, color: "#dc2626", flex: 1 }}>Eliminare la versione <strong>{v.tag}</strong>? Non è reversibile.</span>
              <button onClick={() => { deleteVersion(toolId, v.id); onDeleted(); }}
                style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 5, background: "#dc2626", color: "#fff", border: "none", cursor: "pointer" }}>
                Elimina
              </button>
              <button onClick={() => setConfirmDelete(false)}
                style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer" }}>
                Annulla
              </button>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 6 }}>
            {!isFirst && (
              confirmRestore ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, color: "#dc2626" }}>Sovrascrive la versione corrente — confermi?</span>
                  <button onClick={() => { onRestore(v.data); setConfirmRestore(false); }}
                    style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 5, background: "#dc2626", color: "#fff", border: "none", cursor: "pointer" }}>
                    Sì, ripristina
                  </button>
                  <button onClick={() => setConfirmRestore(false)}
                    style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer" }}>
                    Annulla
                  </button>
                </div>
              ) : (
                <button onClick={e => { e.stopPropagation(); setConfirmRestore(true); }}
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600,
                    padding: "4px 10px", borderRadius: 6, background: "rgba(0,0,0,0.05)",
                    border: "1px solid rgba(0,0,0,0.1)", color: "rgba(0,0,0,0.55)", cursor: "pointer" }}>
                  <RotateCcw size={10} /> Ripristina questa versione
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function VersionHistoryPanel({ toolId, onRestore, sectionLabels }: VersionHistoryPanelProps) {
  const [expanded,  setExpanded]  = useState(false);
  const [versions,  setVersions]  = useState<VersionSnapshot[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  function refresh() {
    setVersions(listVersions(toolId));
  }

  useEffect(() => {
    if (expanded) refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, toolId]);

  const finalizedCount = versions.filter(v => v.status === "finalized").length;
  const substantialCount = versions.filter(v => v.isSubstantialModification).length;

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "rgba(0,0,0,0.07)", background: "#fff" }}>
      {/* Header */}
      <button
        onClick={() => { setExpanded(v => !v); if (!expanded) refresh(); }}
        className="w-full flex items-center gap-2 px-4 py-3 text-left transition-colors"
        style={{ background: expanded ? "rgba(0,0,0,0.015)" : "#fff", borderBottom: expanded ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
        <History className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "rgba(0,0,0,0.4)" }} />
        <span className="text-[11px] font-medium" style={{ color: "rgba(0,0,0,0.55)" }}>
          Cronologia versioni
        </span>
        {versions.length > 0 && (
          <div style={{ display: "flex", gap: 4, marginLeft: 4 }}>
            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4,
              background: "rgba(13,16,22,0.06)", color: "rgba(0,0,0,0.5)", fontWeight: 600 }}>
              {versions.length} snapshot
            </span>
            {finalizedCount > 0 && (
              <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4,
                background: "rgba(21,128,61,0.08)", color: "#15803d", border: "1px solid rgba(21,128,61,0.2)", fontWeight: 600 }}>
                <FileCheck size={9} style={{ display: "inline", marginRight: 3 }} />
                {finalizedCount} finalizzate
              </span>
            )}
            {substantialCount > 0 && (
              <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4,
                background: "rgba(220,38,38,0.07)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.15)", fontWeight: 600 }}>
                <AlertTriangle size={9} style={{ display: "inline", marginRight: 3 }} />
                {substantialCount} sostanziali
              </span>
            )}
          </div>
        )}
        <span className="ml-auto" style={{ color: "rgba(0,0,0,0.3)" }}>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>

      {/* Body */}
      {expanded && (
        <div>
          {versions.length === 0 ? (
            <div className="px-4 py-6 text-center" style={{ color: "rgba(0,0,0,0.3)" }}>
              <History size={20} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
              <p style={{ fontSize: 12, marginBottom: 4 }}>Nessuna versione salvata</p>
              <p style={{ fontSize: 11 }}>Ogni salvataggio crea uno snapshot ripristinabile.</p>
            </div>
          ) : (
            <>
              {/* Timeline */}
              <div>
                {versions.map((v, i) => (
                  <VersionRow
                    key={v.id} v={v} i={i} toolId={toolId}
                    onRestore={(data) => { onRestore(data); setExpanded(false); }}
                    sectionLabels={sectionLabels}
                    onUpdated={refresh}
                    onDeleted={refresh}
                  />
                ))}
              </div>

              {/* Footer actions */}
              <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(0,0,0,0.05)", display: "flex", justifyContent: "flex-end" }}>
                {confirmClear ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: "#dc2626" }}>Eliminare tutte le {versions.length} versioni?</span>
                    <button onClick={() => { clearVersions(toolId); refresh(); setConfirmClear(false); }}
                      style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 5, background: "#dc2626", color: "#fff", border: "none", cursor: "pointer" }}>
                      Elimina tutto
                    </button>
                    <button onClick={() => setConfirmClear(false)}
                      style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer" }}>
                      Annulla
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmClear(true)}
                    style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "rgba(0,0,0,0.35)",
                      background: "none", border: "none", cursor: "pointer" }}>
                    <Trash2 size={10} /> Cancella storico
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
