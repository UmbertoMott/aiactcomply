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
  Clock, RefreshCw, Plus, Info
} from "lucide-react";

const FONT = { fontFamily: "Inter, system-ui, sans-serif" };

type SystemWithRecord = {
  system: AISystem;
  record: DeployerDashboardRecord | null;
};

function statusBadge(status: DeployerDashboardRecord["overallStatus"]) {
  const map = {
    compliant: { label: "Conforme", color: "#16a34a", bg: "#f0fdf4" },
    in_progress: { label: "In corso", color: "#d97706", bg: "#fffbeb" },
    attention: { label: "Attenzione", color: "#dc2626", bg: "#fef2f2" },
    pending: { label: "Da iniziare", color: "#6b7280", bg: "#f9fafb" },
  };
  const s = map[status];
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}22` }}
    >
      {s.label}
    </span>
  );
}

function progressBar(done: number, total: number) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "#e5e7eb" }}>
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%`, background: pct === 100 ? "#16a34a" : "#2563eb" }}
        />
      </div>
      <span className="text-[11px] tabular-nums" style={{ color: "#6b7280" }}>
        {done}/{total}
      </span>
    </div>
  );
}

export default function DeployerDashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<SystemWithRecord[]>([]);

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

  useEffect(() => {
    load();
  }, [load]);

  const totalSystems = items.length;
  const compliant = items.filter((i) => i.record?.overallStatus === "compliant").length;
  const attention = items.filter((i) => i.record?.overallStatus === "attention").length;

  return (
    <div className="w-full" style={{ ...FONT, color: "#0D1016" }}>
      <ProviderTransitionAlertBanner />
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserCheck size={20} style={{ color: "#2563eb" }} />
            <h1 className="text-xl font-bold" style={{ color: "#0D1016" }}>
              Deployer Dashboard
            </h1>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ background: "#eff6ff", color: "#2563eb" }}>
              Art. 26
            </span>
          </div>
          <p className="text-sm" style={{ color: "#6b7280" }}>
            Gestione obblighi per i sistemi AI in cui l&apos;organizzazione agisce come deployer
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border"
          style={{ borderColor: "#e5e7eb", color: "#374151" }}
        >
          <RefreshCw size={14} />
          Aggiorna
        </button>
      </div>

      {/* Sanctions note */}
      <div
        className="flex items-start gap-3 p-3 rounded-lg mb-6 text-sm"
        style={{ background: "#fef9c3", border: "1px solid #fde047", color: "#713f12" }}
      >
        <Info size={16} className="mt-0.5 flex-shrink-0" />
        <span>
          <strong>Sanzioni Art. 99–101:</strong> Il mancato rispetto degli obblighi del deployer può comportare
          sanzioni fino a 15 milioni di euro o il 3% del fatturato mondiale annuo.{" "}
          <span style={{ opacity: 0.8 }}>[verificare sul testo AI Act vigente]</span>
        </span>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Sistemi totali", value: totalSystems, color: "#0D1016" },
          { label: "Conformi", value: compliant, color: "#16a34a" },
          { label: "Richiedono attenzione", value: attention, color: "#dc2626" },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-xl p-4"
            style={{ background: "#fff", border: "1px solid #e5e7eb" }}
          >
            <div className="text-2xl font-bold" style={{ color: k.color }}>
              {k.value}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* System cards */}
      {items.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl"
          style={{ background: "#fff", border: "1px dashed #d1d5db" }}
        >
          <UserCheck size={36} className="mx-auto mb-3" style={{ color: "#9ca3af" }} />
          <p className="font-medium" style={{ color: "#374151" }}>
            Nessun sistema con ruolo deployer
          </p>
          <p className="text-sm mt-1 mb-4" style={{ color: "#6b7280" }}>
            Aggiungi sistemi AI dall&apos;inventario con ruolo &ldquo;deployer&rdquo; per iniziare.
          </p>
          <Link
            href="/dashboard/tools/inventory"
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg"
            style={{ background: "#2563eb", color: "#fff" }}
          >
            <Plus size={14} />
            Vai all&apos;Inventario
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(({ system, record }) => {
            const applicable = record
              ? getApplicableObligations(record.flags)
              : DEPLOYER_OBLIGATIONS.filter((o) => o.alwaysApplicable);
            const doneCount = record
              ? record.obligations.filter(
                  (o) => o.status === "done" || o.status === "na"
                ).length
              : 0;
            const totalCount = applicable.length;
            const status = record?.overallStatus ?? "pending";
            const tier = system.tier ?? "unclassified";

            return (
              <Link
                key={system.id}
                href={`/dashboard/tools/deployer-dashboard/${system.id}`}
                className="block rounded-xl p-4 transition-all hover:shadow-md group"
                style={{ background: "#fff", border: "1px solid #e5e7eb" }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate" style={{ color: "#0D1016" }}>
                        {system.name}
                      </span>
                      {statusBadge(status)}
                      <span
                        className="text-[11px] px-1.5 py-0.5 rounded"
                        style={{ background: "#f3f4f6", color: "#6b7280" }}
                      >
                        {tier}
                      </span>
                      {system.dualRoleFlag && (
                        <span
                          className="text-[11px] px-1.5 py-0.5 rounded"
                          style={{ background: "#fef3c7", color: "#b45309" }}
                        >
                          dual role
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1 line-clamp-1" style={{ color: "#6b7280" }}>
                      {system.description || "Nessuna descrizione disponibile"}
                    </p>
                    {progressBar(doneCount, totalCount)}
                  </div>
                  <ChevronRight
                    size={16}
                    className="ml-3 mt-1 flex-shrink-0 group-hover:translate-x-0.5 transition-transform"
                    style={{ color: "#9ca3af" }}
                  />
                </div>

                {/* Alert strip if attention */}
                {status === "attention" && (
                  <div
                    className="flex items-center gap-1.5 mt-2 text-xs"
                    style={{ color: "#dc2626" }}
                  >
                    <AlertTriangle size={12} />
                    Obblighi non avviati — intervento richiesto
                  </div>
                )}
                {status === "compliant" && (
                  <div
                    className="flex items-center gap-1.5 mt-2 text-xs"
                    style={{ color: "#16a34a" }}
                  >
                    <CheckCircle2 size={12} />
                    Tutti gli obblighi completati
                  </div>
                )}
                {status === "in_progress" && (
                  <div
                    className="flex items-center gap-1.5 mt-2 text-xs"
                    style={{ color: "#d97706" }}
                  >
                    <Clock size={12} />
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
