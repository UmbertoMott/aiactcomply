"use client";

import { Shield, Download, ExternalLink, Award } from "lucide-react";

const certificates = [
  { name: "ISO 42001", status: "certified", desc: "Sistema di gestione IA", expires: "Dic 2026" },
  { name: "AI Act Compliance", status: "in_progress", desc: "Regolamento UE 2024/1689", expires: "—" },
  { name: "SOC 2 Type II", status: "certified", desc: "Sicurezza e riservatezza", expires: "Mar 2027" },
  { name: "GDPR", status: "certified", desc: "Protezione dati personali", expires: "Giu 2027" },
];

export default function TrustCenterPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Trust Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Centro di trasparenza pubblico/gated per mostrare certificati di
          conformità, badge ISO 42001 e prove di compliance AI Act.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Certificazioni attive", value: "3", color: "text-success" },
          { label: "In progress", value: "1", color: "text-warning" },
          { label: "Badge compliance", value: "4", color: "text-primary" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4">
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            Certificazioni & Audit
          </h2>
        </div>
        <div className="divide-y divide-border/50">
          {certificates.map((c) => (
            <div key={c.name} className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className={`rounded-lg p-2 ${
                  c.status === "certified" ? "bg-success/10" : "bg-warning/10"
                }`}>
                  <Award className={`h-4 w-4 ${
                    c.status === "certified" ? "text-success" : "text-warning"
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-medium ${
                  c.status === "certified" ? "text-success" : "text-warning"
                }`}>
                  {c.status === "certified" ? "Certificato" : "In corso"}
                </span>
                {c.expires !== "—" && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">Scade {c.expires}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Public Trust Page
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            La tua pagina pubblica di fiducia con badge di conformità verificabili
            dai clienti e auditor.
          </p>
          <button className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground flex items-center gap-1">
            <ExternalLink className="h-3.5 w-3.5" />
            Apri pagina pubblica
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Compliance Badge Kit
          </h2>
          <div className="space-y-2">
            {[
              { label: "AI Act Compliant", active: true },
              { label: "ISO 42001 Certified", active: true },
              { label: "FRIA Approved", active: false },
            ].map((b) => (
              <div key={b.label} className={`rounded-lg border px-3 py-2 text-xs flex items-center justify-between ${
                b.active ? "border-success/30 bg-success/5" : "border-border"
              }`}>
                <span className={b.active ? "text-success" : "text-muted-foreground"}>
                  <Shield className="h-3 w-3 inline mr-1" />
                  {b.label}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {b.active ? "Disponibile" : "Prossimamente"}
                </span>
              </div>
            ))}
          </div>
          <button className="mt-4 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <Download className="h-3.5 w-3.5" />
            Download Badge Kit
          </button>
        </div>
      </div>
    </div>
  );
}
