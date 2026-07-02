"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Mail, Link2, X, Crown, Check, Clock, ArrowRight } from "lucide-react";
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

// ── Design tokens (allineati alla dashboard) ───────────────────────────────────
const T = {
  text:   "#0D1016",
  muted:  "rgba(0,0,0,0.40)",
  faint:  "rgba(0,0,0,0.22)",
  border: "rgba(0,0,0,0.08)",
  green:  "#059669",
  amber:  "#b45309",
  red:    "#dc2626",
} as const;

export function ProjectMembers() {
  const [project, setProject] = useState<AIProject | null>(null);
  const [plan, setPlan]       = useState<PlanMeta>(getPlanMeta());
  const [members, setMembers] = useState<ProjectMember[]>([]);
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

  // Mostra la sezione solo con un progetto selezionato
  if (!project) return null;

  const used     = members.length;
  const limit    = plan.maxMembers;
  const atLimit  = used >= limit;
  const canAdd   = limit > 0 && !atLimit;

  function handleAdd() {
    if (!project) return;
    const clean = email.trim();
    if (!clean) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) { setError("Email non valida."); return; }
    if (hasMember(project.id, clean))              { setError("Questo membro è già stato invitato."); return; }
    const added = addMember(project.id, clean);
    if (!added) { setError("Impossibile aggiungere il membro."); return; }
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

  const limitLabel = plan.openEnded ? `${limit}+` : `${limit}`;

  return (
    <div
      style={{
        background: "#ffffff",
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.015)",
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      {/* Header */}
      <div style={{ padding: "12px 18px 10px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Users size={13} style={{ color: T.faint }} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.9px", textTransform: "uppercase", color: T.faint }}>
            MEMBRI DEL PROGETTO
          </span>
          <span style={{ fontSize: 9, color: T.faint }}>· {project.name}</span>
        </div>
        <span
          style={{
            fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
            background: "rgba(0,0,0,0.04)", color: T.muted,
          }}
        >
          {used}/{limitLabel} membri · {plan.label}
        </span>
      </div>

      <div style={{ padding: "12px 18px 16px" }}>
        {/* Proprietario */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: members.length ? `1px solid ${T.border}` : "none" }}>
          <div style={{ width: 26, height: 26, borderRadius: 999, background: T.text, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Crown size={12} style={{ color: "#fff" }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: T.text }}>Tu</span>
            <span style={{ fontSize: 11, color: T.faint, marginLeft: 8 }}>Proprietario</span>
          </div>
        </div>

        {/* Membri invitati */}
        {members.map((m, i) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < members.length - 1 ? `1px solid ${T.border}` : "none" }}>
            <div style={{ width: 26, height: 26, borderRadius: 999, background: "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Mail size={12} style={{ color: T.muted }} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: 12.5, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{m.email}</span>
            </div>
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
              title="Rimuovi membro"
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
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                placeholder="email@collega.it"
                style={{
                  flex: 1, minWidth: 180, fontSize: 12.5, padding: "8px 12px", borderRadius: 8,
                  border: `1px solid ${T.border}`, color: T.text, outline: "none",
                }}
              />
              <button
                onClick={handleAdd}
                disabled={!email.trim()}
                style={{
                  fontSize: 12.5, fontWeight: 500, padding: "8px 16px", borderRadius: 8, border: "none",
                  background: T.text, color: "#fff", cursor: email.trim() ? "pointer" : "not-allowed",
                  opacity: email.trim() ? 1 : 0.4, display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                <Mail size={13} /> Invita
              </button>
              <button
                onClick={handleCopyLink}
                style={{
                  fontSize: 12.5, fontWeight: 500, padding: "8px 14px", borderRadius: 8,
                  border: `1px solid ${T.border}`, background: "#fff", color: T.text,
                  cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                <Link2 size={13} /> {copied ? "Link copiato!" : "Copia link"}
              </button>
            </div>
            {error && <p style={{ fontSize: 11, color: T.red, marginTop: 8 }}>{error}</p>}
            <p style={{ fontSize: 10.5, color: T.faint, marginTop: 8, lineHeight: 1.5 }}>
              Puoi invitare ancora {limit - used} {limit - used === 1 ? "membro" : "membri"} con il piano {plan.label}.
            </p>
          </div>
        ) : (
          <div
            style={{
              marginTop: 14, padding: "14px 16px", borderRadius: 8,
              background: "rgba(0,0,0,0.03)", border: `1px solid ${T.border}`,
            }}
          >
            <p style={{ fontSize: 12.5, fontWeight: 500, color: T.text, marginBottom: 4 }}>
              {limit === 0
                ? "Il piano Essenziale include un solo utente."
                : `Hai raggiunto il limite di ${limitLabel} membri del piano ${plan.label}.`}
            </p>
            <p style={{ fontSize: 11.5, color: T.muted, marginBottom: 12, lineHeight: 1.5 }}>
              {limit === 0
                ? "Passa a Studio (fino a 3 membri) o Su misura (5 o più) per collaborare in team."
                : "Passa a Su misura per aggiungere 5 o più membri."}
            </p>
            <Link
              href="/pricing"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500,
                color: "#fff", background: T.text, padding: "8px 16px", borderRadius: 8, textDecoration: "none",
              }}
            >
              Aggiorna piano <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
