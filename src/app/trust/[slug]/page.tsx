"use client";

import { useState, useEffect } from "react";
import { Shield, CheckCircle, AlertCircle, Circle, Award, FileText } from "lucide-react";
import {
  loadSnapshot,
  type TrustSnapshot,
  type ComplianceSignal,
} from "@/lib/trust/trust-snapshot";

// ─── HELPERS ────────────────────────────────────────────────────────────

function SignalIcon({ status }: { status: ComplianceSignal["status"] }) {
  if (status === "ok")
    return <CheckCircle className="h-4 w-4 shrink-0" style={{ color: "#22c55e" }} />;
  if (status === "partial")
    return <AlertCircle className="h-4 w-4 shrink-0" style={{ color: "#ca8a04" }} />;
  return <Circle className="h-4 w-4 shrink-0" style={{ color: "#4b5563" }} />;
}

function statusLabel(status: ComplianceSignal["status"]) {
  if (status === "ok") return "Conforme";
  if (status === "partial") return "Parziale";
  return "N/D";
}

function statusColor(status: ComplianceSignal["status"]) {
  if (status === "ok") return "#22c55e";
  if (status === "partial") return "#ca8a04";
  return "#4b5563";
}

function riskPillColor(riskLevel: string) {
  if (riskLevel === "Alto rischio" || riskLevel === "Inaccettabile") return "#ef4444";
  if (riskLevel === "Rischio limitato") return "#f59e0b";
  if (riskLevel === "Rischio minimo") return "#22c55e";
  return "#6b7280";
}

function scoreColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

// ─── PAGE ────────────────────────────────────────────────────────────────

export default function PublicTrustPage({
  params,
}: {
  params: { slug: string };
}) {
  const [snapshot, setSnapshot] = useState<TrustSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = loadSnapshot(params.slug);
    setSnapshot(data);
    setLoading(false);
  }, [params.slug]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0D1016",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "#64748b", fontSize: 14 }}>Caricamento…</div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0D1016",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: "40px 20px",
        }}
      >
        <Shield style={{ width: 40, height: 40, color: "#334155" }} />
        <h1 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 700 }}>
          Pagina non disponibile
        </h1>
        <p style={{ color: "#64748b", fontSize: 14, textAlign: "center", maxWidth: 400 }}>
          La pagina pubblica per <strong style={{ color: "#94a3b8" }}>{params.slug}</strong> non
          è ancora stata pubblicata o non è accessibile da questo dispositivo.
        </p>
        <p style={{ color: "#475569", fontSize: 12 }}>
          Il proprietario deve cliccare "Pubblica aggiornamento" nel Trust Center.
        </p>
      </div>
    );
  }

  const riskColor = riskPillColor(snapshot.riskLevel);
  const okCount = snapshot.complianceSignals.filter((s) => s.status === "ok").length;
  const partialCount = snapshot.complianceSignals.filter(
    (s) => s.status === "partial"
  ).length;
  const sc = scoreColor(snapshot.conformityScore);

  return (
    <div style={{ minHeight: "100vh", background: "#0D1016", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div
        style={{
          background: "#131820",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          padding: "24px 20px",
        }}
      >
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Shield style={{ width: 20, height: 20, color: "#3b82f6" }} />
              <span style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>
                {snapshot.systemName}
              </span>
              <span
                style={{
                  background: riskColor + "22",
                  color: riskColor,
                  border: `1px solid ${riskColor}44`,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 10px",
                  borderRadius: 20,
                }}
              >
                {snapshot.riskLevel}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Trust Center Pubblico · Powered by{" "}
              <span style={{ color: "#3b82f6", fontWeight: 600 }}>AIComply</span>
              {" · "}EU AI Act 2024/1689
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#64748b", textAlign: "right" }}>
            Ultimo aggiornamento
            <br />
            <span style={{ color: "#94a3b8" }}>
              {new Date(snapshot.publishedAt).toLocaleString("it-IT")}
            </span>
          </div>
        </div>
      </div>

      {/* ── BODY ───────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 20px" }}>

        {/* Score cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {[
            { value: `${snapshot.conformityScore}%`, label: "Score conformità", color: sc },
            {
              value: `${okCount + partialCount}/${snapshot.complianceSignals.length}`,
              label: "Tool documentati",
              color: "#3b82f6",
            },
            { value: String(snapshot.signOffs.length), label: "Firme di revisione", color: "#22c55e" },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                background: "#131820",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                padding: 20,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 36, fontWeight: 700, color: card.color, letterSpacing: "-1px" }}>
                {card.value}
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* Compliance signals */}
        <div
          style={{
            background: "#131820",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12,
            padding: 24,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 16,
            }}
          >
            Segnali di conformità
          </div>
          {snapshot.complianceSignals.length === 0 ? (
            <div style={{ color: "#64748b", fontSize: 13 }}>Nessun dato disponibile</div>
          ) : (
            snapshot.complianceSignals.map((sig, i) => (
              <div
                key={sig.tool}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom:
                    i < snapshot.complianceSignals.length - 1
                      ? "1px solid rgba(255,255,255,0.05)"
                      : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <SignalIcon status={sig.status} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#f1f5f9" }}>
                      {sig.label}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{sig.article}</div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: statusColor(sig.status),
                  }}
                >
                  {statusLabel(sig.status)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Certifications */}
        {snapshot.certifications.length > 0 && (
          <div
            style={{
              background: "#131820",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12,
              padding: 24,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 16,
              }}
            >
              Certificazioni attive
            </div>
            {snapshot.certifications.map((cert, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom:
                    i < snapshot.certifications.length - 1
                      ? "1px solid rgba(255,255,255,0.05)"
                      : "none",
                }}
              >
                <Award style={{ width: 16, height: 16, color: "#22c55e", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#f1f5f9" }}>
                    {cert.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    {cert.issuedBy}
                    {cert.expiresAt ? ` · Scade ${cert.expiresAt}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sign-offs */}
        {snapshot.signOffs.length > 0 && (
          <div
            style={{
              background: "#131820",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12,
              padding: 24,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 16,
              }}
            >
              Firme di revisione
            </div>
            {snapshot.signOffs.map((sf, i) => (
              <div
                key={sf.toolKey}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom:
                    i < snapshot.signOffs.length - 1
                      ? "1px solid rgba(255,255,255,0.05)"
                      : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <FileText style={{ width: 14, height: 14, color: "#3b82f6", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#f1f5f9" }}>
                      {sf.toolLabel}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      {sf.reviewedBy}
                      {sf.reviewerRole ? ` · ${sf.reviewerRole}` : ""}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#22c55e" }}>
                  {sf.reviewedAt
                    ? new Date(sf.reviewedAt).toLocaleDateString("it-IT")
                    : ""}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI Passport Hash */}
        {snapshot.passportHash && (
          <div
            style={{
              background: "#131820",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12,
              padding: 24,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 12,
              }}
            >
              AI Passport Hash
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                color: "#94a3b8",
                background: "#0D1016",
                padding: 12,
                borderRadius: 8,
                wordBreak: "break-all",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {snapshot.passportHash}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: "#475569" }}>
              Hash crittografico certificato — EU AI Act Art. 6, Allegato III
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            padding: "32px 0 0",
            fontSize: 12,
            color: "#334155",
          }}
        >
          Generato da{" "}
          <strong style={{ color: "#3b82f6" }}>AIComply</strong>
          {" · "}Conformità EU AI Act 2024/1689
          {" · "}
          {new Date(snapshot.publishedAt).toLocaleDateString("it-IT")}
        </div>
      </div>
    </div>
  );
}
