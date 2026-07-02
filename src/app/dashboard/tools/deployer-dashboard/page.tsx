"use client";
import React, { useEffect, useState, useCallback } from "react";
import ProviderTransitionAlertBanner from "@/components/shared/provider-transition-alert-banner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadInventory, type AISystem } from "@/lib/inventory/ai-system";
import {
  loadDeployerDashboard,
  ensureSystemRecord,
  computeOverallStatus,
  type DeployerDashboardRecord,
} from "@/lib/deployer/deployer-types";
import { getApplicableObligations, DEPLOYER_OBLIGATIONS } from "@/lib/deployer/deployer-obligations";
import {
  UserCheck, ChevronRight, AlertTriangle, CheckCircle2,
  Clock, RefreshCw, Plus, Info, X
} from "lucide-react";

const FONT = "var(--font-inter, system-ui)";

type SystemWithRecord = {
  system: AISystem;
  record: DeployerDashboardRecord | null;
};

function statusBadge(status: DeployerDashboardRecord["overallStatus"]) {
  const map = {
    compliant:   { label: "Conforme",    color: "#16a34a", bg: "rgba(22,163,74,0.07)"  },
    in_progress: { label: "In corso",    color: "#b45309", bg: "rgba(180,83,9,0.07)"   },
    attention:   { label: "Attenzione",  color: "#dc2626", bg: "rgba(220,38,38,0.07)"  },
    pending:     { label: "Da iniziare", color: "rgba(0,0,0,0.4)", bg: "rgba(0,0,0,0.04)" },
  };
  const s = map[status];
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "1px 8px", borderRadius: 10,
      color: s.color, background: s.bg, border: `1px solid ${s.color}33`,
      fontFamily: FONT,
    }}>
      {s.label}
    </span>
  );
}

function progressBar(done: number, total: number) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
      <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(0,0,0,0.07)" }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: 2,
          background: pct === 100 ? "#16a34a" : "#0D1016",
          transition: "width 0.4s",
        }} />
      </div>
      <span style={{ fontSize: 10, color: "rgba(0,0,0,0.4)", fontFamily: "monospace" }}>
        {done}/{total}
      </span>
    </div>
  );
}

export default function DeployerDashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<SystemWithRecord[]>([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const load = useCallback(() => {
    const inventory = loadInventory();
    const deployers = inventory.filter(
      (s) => s.role === "deployer" || s.dualRoleFlag
    );
    const allRecords = loadDeployerDashboard();

    const loaded: SystemWithRecord[] = deployers.map((system) => {
      if (!allRecords[system.id]) {
        ensureSystemRecord(system.id, system.name, system.tier);
      }
      const record = allRecords[system.id] ?? null;
      return { system, record };
    });
    setItems(loaded);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalSystems = items.length;
  const compliant  = items.filter((i) => i.record?.overallStatus === "compliant").length;
  const attention  = items.filter((i) => i.record?.overallStatus === "attention").length;

  return (
    <div style={{ fontFamily: FONT, color: "#0D1016" }}>
      <ProviderTransitionAlertBanner />

      {/* Header — stile identico a Risk Manager */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.3)", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 4 }}>
            Art. 26 · Reg. UE 2024/1689
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <UserCheck size={18} style={{ color: "#0D1016" }} />
            <h1 style={{ fontSize: 24, fontWeight: 500, color: "#0D1016", letterSpacing: "-0.8px", margin: 0 }}>
              Deployer Dashboard
            </h1>
          </div>
          <p style={{ fontSize: 12, color: "rgba(0,0,0,0.4)", margin: 0 }}>
            Gestione obblighi per i sistemi AI in cui l&apos;organizzazione agisce come deployer
          </p>
        </div>
        <button
          onClick={load}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 11, padding: "6px 12px", borderRadius: 20,
            background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(0,0,0,0.07)", cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <RefreshCw size={12} /> Aggiorna
        </button>
      </div>

      {/* Sanctions note */}
      {!bannerDismissed && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          padding: "10px 14px", borderRadius: 8, marginBottom: 20,
          background: "#fef9c3", border: "1px solid #fde047",
          color: "#713f12", fontSize: 11, position: "relative",
        }}>
          <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ flex: 1 }}>
            <strong>Sanzioni Art. 99–101:</strong> Il mancato rispetto degli obblighi del deployer può comportare
            sanzioni fino a 15 milioni di euro o il 3% del fatturato mondiale annuo.{" "}
            <span style={{ opacity: 0.7 }}>[verificare sul testo AI Act vigente]</span>
          </span>
          <button
            onClick={() => setBannerDismissed(true)}
            style={{
              flexShrink: 0, background: "none", border: "none", cursor: "pointer",
              padding: 2, color: "#713f12", opacity: 0.6, lineHeight: 1,
              display: "flex", alignItems: "center",
            }}
            aria-label="Chiudi"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Sistemi totali",        value: totalSystems, color: "#0D1016"  },
          { label: "Conformi",              value: compliant,    color: "#16a34a"  },
          { label: "Richiedono attenzione", value: attention,    color: "#dc2626"  },
        ].map((k) => (
          <div key={k.label} style={{ borderRadius: 10, padding: "14px 16px", background: "#fff", border: "1px solid rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color, lineHeight: 1 }}>
              {k.value}
            </div>
            <div style={{ fontSize: 11, marginTop: 4, color: "rgba(0,0,0,0.45)" }}>
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* System cards / empty state */}
      {items.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "56px 24px", borderRadius: 10,
          background: "#fff", border: "1px dashed rgba(0,0,0,0.12)",
        }}>
          <UserCheck size={24} style={{ color: "rgba(0,0,0,0.18)", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 13, fontWeight: 500, color: "#0D1016", margin: "0 0 4px" }}>
            Nessun sistema con ruolo deployer
          </p>
          <p style={{ fontSize: 12, color: "rgba(0,0,0,0.4)", margin: "0 0 20px" }}>
            Aggiungi sistemi AI dall&apos;inventario con ruolo &ldquo;deployer&rdquo; per iniziare.
          </p>
          <Link
            href="/dashboard/tools/inventory"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 8,
              background: "#0D1016", color: "#fff", textDecoration: "none",
            }}
          >
            <Plus size={13} />
            Vai all&apos;Inventario
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map(({ system, record }) => {
            const applicable = record
              ? getApplicableObligations(record.flags)
              : DEPLOYER_OBLIGATIONS.filter((o) => o.alwaysApplicable);
            const doneCount  = record ? record.obligations.filter((o) => o.status === "done" || o.status === "na").length : 0;
            const totalCount = applicable.length;
            const status     = record?.overallStatus ?? "pending";
            const tier       = system.tier ?? "unclassified";

            return (
              <Link
                key={system.id}
                href={`/dashboard/tools/deployer-dashboard/${system.id}`}
                style={{
                  display: "block", borderRadius: 10, padding: "14px 16px",
                  background: "#fff", border: "1px solid rgba(0,0,0,0.07)",
                  textDecoration: "none", transition: "box-shadow 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.07)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#0D1016" }}>
                        {system.name}
                      </span>
                      {statusBadge(status)}
                      <span style={{
                        fontSize: 10, padding: "1px 6px", borderRadius: 4,
                        background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.45)",
                      }}>
                        {tier}
                      </span>
                      {system.dualRoleFlag && (
                        <span style={{
                          fontSize: 10, padding: "1px 6px", borderRadius: 4,
                          background: "rgba(180,83,9,0.08)", color: "#b45309",
                        }}>
                          dual role
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {system.description || "Nessuna descrizione disponibile"}
                    </p>
                    {progressBar(doneCount, totalCount)}
                  </div>
                  <ChevronRight size={14} style={{ marginLeft: 12, marginTop: 2, flexShrink: 0, color: "rgba(0,0,0,0.25)" }} />
                </div>

                {status === "attention" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 10, color: "#dc2626" }}>
                    <AlertTriangle size={11} />
                    Obblighi non avviati — intervento richiesto
                  </div>
                )}
                {status === "compliant" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 10, color: "#16a34a" }}>
                    <CheckCircle2 size={11} />
                    Tutti gli obblighi completati
                  </div>
                )}
                {status === "in_progress" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 10, color: "#b45309" }}>
                    <Clock size={11} />
                    Conformità in corso
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
