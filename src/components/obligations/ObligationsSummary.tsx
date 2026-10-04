"use client";
import Link from "next/link";
import { ROLE_LABEL, formatDate, type Obligation, type Role } from "@/lib/obligations/engine";

const T = { text: "#0D1016", muted: "rgba(0,0,0,0.45)", faint: "rgba(0,0,0,0.25)", border: "rgba(0,0,0,0.08)", amber: "#b45309" } as const;
const card: React.CSSProperties = { background: "#ffffff", border: `1px solid ${T.border}`, borderRadius: 12, padding: "20px 22px", marginBottom: 12 };

// ─── Riepilogo obblighi ───────────────────────────────────────────────────────

const GROUP_LABEL: Record<Obligation["group"], string> = {
  prohibited: "Pratica vietata", all: "Per tutti", provider: "Come fornitore", deployer: "Come deployer",
  importer: "Come importatore", distributor: "Come distributore", transparency: "Trasparenza (Art. 50)", gpai: "Modello GPAI (Capo V)",
};
const GROUP_ORDER: Obligation["group"][] = ["prohibited", "all", "provider", "deployer", "importer", "distributor", "transparency", "gpai"];

export default function ObligationsSummary({ roles, obligations, notes, riskTitle, riskColor }: {
  roles: Role[]; obligations: Obligation[]; notes: string[]; riskTitle: string; riskColor: string;
}) {
  return (
    <>
      <div style={card}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: T.muted, margin: "0 0 6px" }}>RISULTATO</p>
        <p style={{ fontSize: 15, color: T.text, margin: 0 }}>
          <strong>{roles.length ? roles.map(r => ROLE_LABEL[r]).join(" + ") : "Nessun ruolo operativo"}</strong>
          {" · "}<strong style={{ color: riskColor }}>{riskTitle}</strong>
          {" · "}{obligations.length} {obligations.length === 1 ? "obbligo" : "obblighi"}
        </p>
      </div>
      {notes.map((n, i) => (
        <div key={i} style={{ ...card, padding: "12px 16px", background: "rgba(180,83,9,0.04)", borderColor: "rgba(180,83,9,0.2)" }}>
          <p style={{ fontSize: 12.5, color: T.text, margin: 0, lineHeight: 1.5 }}>{n}</p>
        </div>
      ))}
      {GROUP_ORDER.map(g => {
        const items = obligations.filter(o => o.group === g);
        if (!items.length) return null;
        return (
          <div key={g} style={{ ...card, padding: 0, overflow: "hidden" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: T.muted, margin: 0, padding: "12px 18px", borderBottom: `1px solid ${T.border}` }}>{GROUP_LABEL[g].toUpperCase()}</p>
            {items.map((o, i) => (
              <div key={o.id} style={{ padding: "12px 18px", borderTop: i ? `1px solid ${T.border}` : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: T.text, margin: 0 }}>{o.title}</p>
                  <span style={{ fontSize: 11, color: T.muted, whiteSpace: "nowrap" }}>{o.article}</span>
                </div>
                <p style={{ fontSize: 12.5, color: T.muted, margin: "4px 0 6px", lineHeight: 1.5 }}>{o.what}</p>
                {o.note && <p style={{ fontSize: 12, color: T.amber, margin: "0 0 6px" }}>{o.note}</p>}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: T.muted }}>
                  <span>Si applica dal {formatDate(o.appliesFrom)}</span>
                  {o.iso.length > 0 && <span>ISO/IEC 42001: {o.iso.join(", ")}</span>}
                  {o.tool && <Link href={o.tool.href} style={{ color: T.text, fontWeight: 600 }}>Apri {o.tool.label} →</Link>}
                </div>
              </div>
            ))}
          </div>
        );
      })}
      <p style={{ fontSize: 11, color: T.faint, lineHeight: 1.5, margin: "4px 2px 0" }}>
        Corrispondenze con ISO/IEC 42001:2023 (clausole 4-10 e controlli dell&apos;Allegato A): numerazione verificata sulla norma, abbinamento con gli articoli di natura interpretativa. Il rispetto della norma non equivale alla conformità al regolamento.
      </p>
    </>
  );
}
