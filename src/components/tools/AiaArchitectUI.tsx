const rows = [
  { fonte: "DB_utenti", col: "eta", feature: "age_group", trasf: "binning(0-18...)", bias: "23%", level: "med" },
  { fonte: "DB_utenti", col: "reddito", feature: "income_bracket", trasf: "binning+scaling", bias: "45%", level: "high" },
  { fonte: "DB_utenti", col: "cap_residenza", feature: "district", trasf: "one-hot encoding", bias: "12%", level: "low" },
  { fonte: "DB_storico", col: "esito_prec.", feature: "prev_outcome", trasf: "label encoding", bias: "8%", level: "low" },
  { fonte: "Snowflake.prod", col: "cod_settore", feature: "sector", trasf: "entity embedding", bias: "67%", level: "high" },
];

const biasStyle: Record<string, React.CSSProperties> = {
  high: { background: "#fee2e2", color: "#dc2626" },
  med: { background: "#fef3c7", color: "#d97706" },
  low: { background: "#dcfce7", color: "#16a34a" },
};

export default function AiaArchitectUI() {
  return (
    <div className="flex h-full text-[#111] pointer-events-none select-none" style={{ minHeight: "484px" }}>
      {/* Sidebar */}
      <div
        className="flex-shrink-0 p-3"
        style={{ width: "140px", borderRight: "1px solid #f0f0f0", background: "#fff" }}
      >
        <div
          className="flex items-center gap-1.5 text-[12px] font-bold mb-4"
          style={{ color: "#1a1a1a" }}
        >
          <div
            className="w-4 h-4 rounded"
            style={{ background: "linear-gradient(135deg,#3b82f6,#6366f1)" }}
          />
          AIComply
        </div>
        <div
          className="text-[9px] font-semibold uppercase mb-1.5"
          style={{ color: "#999", letterSpacing: "0.8px" }}
        >
          Moduli
        </div>
        {[
          { label: "AIA-Architect", tag: "Art.11", active: true },
          { label: "Rights-Simulator", tag: "Art.27", active: false },
          { label: "Guardian-Agent", tag: "Art.14", active: false },
          { label: "Trust-Labeler", tag: "Art.50", active: false },
        ].map(({ label, tag, active }) => (
          <div
            key={label}
            className="flex items-center justify-between text-[10px] px-2 py-1.5 rounded mb-0.5"
            style={
              active
                ? { background: "#eff6ff", color: "#1d4ed8", fontWeight: 500 }
                : { color: "#555" }
            }
          >
            <span>{label}</span>
            <span
              className="text-[8px] px-1.5 py-0.5 rounded"
              style={{ background: "#e0e7ff", color: "#4338ca" }}
            >
              {tag}
            </span>
          </div>
        ))}
      </div>

      {/* Main */}
      <div className="flex-1 p-3.5" style={{ background: "#fafafa" }}>
        <div className="text-[13px] font-bold mb-0.5">AIA-Architect</div>
        <div className="text-[10px] mb-3" style={{ color: "#777" }}>
          Motore AST Parser: analisi semantica → Art. 10 → Dossier Vivente Annex IV
        </div>
        <div className="flex gap-1 mb-3">
          {["Editor Codice", "AST Scan", "Annex IV JSON"].map((tab, i) => (
            <div
              key={tab}
              className="text-[10px] px-2.5 py-1 rounded-md"
              style={
                i === 1
                  ? { background: "#4f46e5", color: "#fff" }
                  : { border: "1px solid #e5e7eb", color: "#666" }
              }
            >
              {tab}
            </div>
          ))}
        </div>
        <div className="text-[11px] font-semibold mb-2">Data Lineage Column-Level — Art. 10</div>
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
          <div
            className="grid text-[9px] font-semibold uppercase px-2.5 py-1.5"
            style={{
              gridTemplateColumns: "80px 85px 80px 1fr 44px",
              background: "#f9fafb",
              borderBottom: "1px solid #e5e7eb",
              color: "#6b7280",
              letterSpacing: "0.5px",
            }}
          >
            <span>Fonte</span>
            <span>Colonna</span>
            <span>Feature</span>
            <span>Trasform.</span>
            <span>Bias</span>
          </div>
          {rows.map(({ fonte, col, feature, trasf, bias, level }) => (
            <div
              key={feature}
              className="grid text-[10px] px-2.5 py-1.5 items-center"
              style={{
                gridTemplateColumns: "80px 85px 80px 1fr 44px",
                borderBottom: "1px solid #f3f4f6",
                color: "#374151",
              }}
            >
              <span className="truncate pr-1">{fonte}</span>
              <span className="truncate pr-1">{col}</span>
              <span className="truncate pr-1" style={{ color: "#2563eb" }}>{feature}</span>
              <span className="truncate pr-1">{trasf}</span>
              <span
                className="text-[9px] font-bold text-center px-1.5 py-0.5 rounded"
                style={biasStyle[level]}
              >
                {bias}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
