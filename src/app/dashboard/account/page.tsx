"use client";

import { useOrgProfile } from "@/lib/hooks/useOrgProfile";

export default function AccountPage() {
  const { profile, setProfile } = useOrgProfile();

  return (
    <div className="max-w-xl mx-auto py-10 px-4 space-y-8">
      <div>
        <h1 className="mb-1" style={{ fontSize: "24px", fontWeight: 600, letterSpacing: "-0.5px", color: "#0D1016" }}>
          Settings
        </h1>
        <p className="text-[13px]" style={{ color: "rgba(0,0,0,0.45)" }}>
          Configurazione organizzazione e preferenze di compliance.
        </p>
      </div>

      {/* Profilo organizzazione */}
      <section>
        <h2 className="text-[13px] font-semibold mb-3" style={{ color: "#0D1016" }}>
          Profilo organizzazione
        </h2>
        <div className="rounded-xl divide-y" style={{ border: "1px solid rgba(0,0,0,0.1)" }}>
          <ToggleRow
            label="Opero con la PA italiana"
            description="Abilita sezioni L.132/2025 e AGID/ACN in Compliance Ops"
            checked={profile.paItaly}
            onChange={(v) => setProfile({ paItaly: v })}
          />
        </div>
      </section>

      {/* Integrazioni framework */}
      <section>
        <h2 className="text-[13px] font-semibold mb-3" style={{ color: "#0D1016" }}>
          Integrazioni framework
        </h2>
        <div className="rounded-xl divide-y" style={{ border: "1px solid rgba(0,0,0,0.1)" }}>
          <ToggleRow
            label="Abilita mapping NIST AI RMF"
            description="Aggiunge tab NIST (GOVERN/MAP/MEASURE/MANAGE) in DocuGen AI — Enterprise"
            checked={profile.nistEnabled}
            onChange={(v) => setProfile({ nistEnabled: v })}
            badge="Enterprise"
          />
        </div>
      </section>

      {/* Stato rilevamento GPAI */}
      {profile.gpaiDetected && (
        <section>
          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.3)" }}
          >
            <span className="text-lg">🤖</span>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "#0D1016" }}>
                Sistema GPAI rilevato
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: "rgba(0,0,0,0.55)" }}>
                Il Triage ha classificato il tuo sistema come modello di uso generale.
                DocuGen AI mostra il modulo GPAI Assessment (Art. 51-55).
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  badge,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium" style={{ color: "#0D1016" }}>{label}</span>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
              style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.45)" }}>{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative flex-shrink-0 w-9 h-5 rounded-full transition-colors"
        style={{ background: checked ? "#0D1016" : "rgba(0,0,0,0.12)" }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm"
          style={{ transform: checked ? "translateX(16px)" : "translateX(0)" }}
        />
      </button>
    </div>
  );
}
