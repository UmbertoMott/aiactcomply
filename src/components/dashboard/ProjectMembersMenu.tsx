"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Mail, Link2, X, Clock, Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  getActiveProject,
  PROJECT_CHANGED_EVENT,
  type AIProject,
} from "@/lib/projects/project-manager";
import {
  listMembers,
  addMember,
  removeMember,
  buildInviteLink,
  hasMember,
  MEMBERS_EVENT_NAME,
  type ProjectMember,
} from "@/lib/projects/project-members";
import { getPlanMeta, PLAN_EVENT_NAME, type PlanMeta } from "@/lib/billing/plan";

const T = {
  text:   "#0D1016",
  muted:  "rgba(0,0,0,0.40)",
  faint:  "rgba(0,0,0,0.22)",
  border: "rgba(0,0,0,0.08)",
  green:  "#059669",
  amber:  "#b45309",
  red:    "#dc2626",
} as const;

export function ProjectMembersMenu() {
  const [project, setProject] = useState<AIProject | null>(null);
  const [plan, setPlan]       = useState<PlanMeta>(getPlanMeta());
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [open, setOpen]       = useState(false);
  const [email, setEmail]     = useState("");
  const [error, setError]     = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);

  const reload = useCallback(() => {
    const p = getActiveProject();
    setProject(p);
    setPlan(getPlanMeta());
    setMembers(p ? listMembers(p.id) : []);
  }, []);

  useEffect(() => {
    reload();
    window.addEventListener(PROJECT_CHANGED_EVENT, reload);
    window.addEventListener(MEMBERS_EVENT_NAME, reload);
    window.addEventListener(PLAN_EVENT_NAME, reload);
    return () => {
      window.removeEventListener(PROJECT_CHANGED_EVENT, reload);
      window.removeEventListener(MEMBERS_EVENT_NAME, reload);
      window.removeEventListener(PLAN_EVENT_NAME, reload);
    };
  }, [reload]);

  // Chiudi con Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Nessun trigger senza progetto attivo
  if (!project) return null;

  const used    = members.length;
  const limit   = plan.maxMembers;
  const atLimit = used >= limit;
  const canAdd  = limit > 0 && !atLimit;
  const limitLabel = plan.openEnded ? `${limit}+` : `${limit}`;

  function handleAdd() {
    if (!project) return;
    const clean = email.trim();
    if (!clean) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) { setError("Email non valida."); return; }
    if (hasMember(project.id, clean))              { setError("Questo membro è già stato invitato."); return; }
    if (!addMember(project.id, clean))             { setError("Impossibile aggiungere il membro."); return; }
    setEmail(""); setError(null);
  }

  async function handleCopyLink() {
    if (!project) return;
    try {
      await navigator.clipboard.writeText(buildInviteLink(project.id));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard non disponibile */ }
  }

  return (
    <>
      {/* Trigger minimal in topbar */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:bg-black/5"
        style={{ color: T.text }}
        title="Membri del progetto"
      >
        <Users className="h-3.5 w-3.5 flex-shrink-0" style={{ color: T.muted }} />
        <span>Membri</span>
        {used > 0 && (
          <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 999, background: "rgba(0,0,0,0.06)", color: T.muted }}>
            {used}
          </span>
        )}
      </button>

      {/* Popup / modal */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center px-4 py-16"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full rounded-2xl overflow-hidden"
            style={{ maxWidth: 480, background: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: T.text, letterSpacing: "-0.3px" }}>Membri del progetto</h2>
                <p style={{ fontSize: 11.5, color: T.muted, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {project.name} · {used}/{limitLabel} membri · piano {plan.label}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: T.faint, padding: 4, display: "flex", flexShrink: 0 }}
                aria-label="Chiudi"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "12px 20px 20px" }}>
              {/* Proprietario (senza icona) */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 0", borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>Tu</span>
                <span style={{ fontSize: 11, color: T.faint }}>Proprietario</span>
              </div>

              {/* Membri invitati */}
              {members.map((m, i) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < members.length - 1 ? `1px solid ${T.border}` : "none" }}>
                  <span style={{ fontSize: 13, color: T.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</span>
                  <span
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600,
                      padding: "2px 8px", borderRadius: 999,
                      background: m.status === "active" ? "rgba(5,150,105,0.08)" : "rgba(180,83,9,0.08)",
                      color: m.status === "active" ? T.green : T.amber,
                    }}
                  >
                    {m.status === "active" ? <Check size={10} /> : <Clock size={10} />}
                    {m.status === "active" ? "Attivo" : "In attesa"}
                  </span>
                  <button
                    onClick={() => project && removeMember(project.id, m.id)}
                    title="Rimuovi"
                    style={{ background: "none", border: "none", cursor: "pointer", color: T.faint, padding: 4, display: "flex" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = T.red)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = T.faint)}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}

              {/* Aggiungi membro / upsell */}
              {canAdd ? (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                      placeholder="email@collega.it"
                      autoFocus
                      style={{ flex: 1, minWidth: 180, fontSize: 13, padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`, color: T.text, outline: "none" }}
                    />
                    <button
                      onClick={handleAdd}
                      disabled={!email.trim()}
                      style={{ fontSize: 13, fontWeight: 500, padding: "9px 16px", borderRadius: 8, border: "none", background: T.text, color: "#fff", cursor: email.trim() ? "pointer" : "not-allowed", opacity: email.trim() ? 1 : 0.4, display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      <Mail size={13} /> Invita
                    </button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button
                      onClick={handleCopyLink}
                      style={{ fontSize: 12.5, fontWeight: 500, padding: "7px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", color: T.text, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      <Link2 size={13} /> {copied ? "Link copiato!" : "Copia link invito"}
                    </button>
                    <span style={{ fontSize: 11, color: T.faint }}>
                      Ancora {limit - used} {limit - used === 1 ? "membro" : "membri"} disponibili
                    </span>
                  </div>
                  {error && <p style={{ fontSize: 11.5, color: T.red, marginTop: 8 }}>{error}</p>}
                </div>
              ) : (
                <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 8, background: "rgba(0,0,0,0.03)", border: `1px solid ${T.border}` }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 4 }}>
                    {limit === 0 ? "Il piano Essenziale include un solo utente." : `Hai raggiunto il limite di ${limitLabel} membri del piano ${plan.label}.`}
                  </p>
                  <p style={{ fontSize: 12, color: T.muted, marginBottom: 12, lineHeight: 1.5 }}>
                    {limit === 0
                      ? "Passa a Studio (fino a 3 membri) o Su misura (5 o più) per collaborare in team."
                      : "Passa a Su misura per aggiungere 5 o più membri."}
                  </p>
                  <Link
                    href="/pricing"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 500, color: "#fff", background: T.text, padding: "8px 16px", borderRadius: 8, textDecoration: "none" }}
                  >
                    Aggiorna piano <ArrowRight size={12} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
