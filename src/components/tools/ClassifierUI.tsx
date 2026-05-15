const navItems = [
  { label: "Evidence Layer", tag: "Core", tagColor: "#4338ca", tagBg: "#e0e7ff" },
  { label: "AIA-Architect", tag: "Art.11", tagColor: "#4338ca", tagBg: "#e0e7ff" },
  { label: "Rights-Simulator", tag: "Art.27", tagColor: "#4338ca", tagBg: "#e0e7ff" },
];

const legacyItems = [
  { label: "AI Classifier", tag: "Art.6", tagColor: "#dc2626", tagBg: "#fee2e2", active: true },
  { label: "Drift Detection", tag: "Art.9", tagColor: "#4338ca", tagBg: "#e0e7ff", active: false },
  { label: "DocuGen AI", tag: "Art.11", tagColor: "#4338ca", tagBg: "#e0e7ff", active: false },
];

const files = [
  { name: "requirements.txt", signals: "3 segnali", color: "#dc2626" },
  { name: "src/api/main.py", signals: "4 segnali", color: "#dc2626" },
  { name: "src/models/screener.py", signals: "3 segnali", color: "#dc2626" },
  { name: "src/utils/preprocessing.py", signals: "1 segnale", color: "#d97706" },
  { name: "src/api/health.py", signals: "—", color: "#aaa" },
  { name: "src/utils/bias_audit.py", signals: "1 segnale", color: "#d97706" },
];

export default function ClassifierUI() {
  return (
    <div className="flex h-full text-[#111] pointer-events-none select-none" style={{ minHeight: "484px" }}>
      {/* Sidebar */}
      <div
        className="flex-shrink-0 p-3.5"
        style={{ width: "155px", borderRight: "1px solid #f0f0f0", background: "#fff" }}
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
          Core
        </div>
        {navItems.map(({ label, tag, tagColor, tagBg }) => (
          <div
            key={label}
            className="flex items-center justify-between text-[10px] px-2 py-1.5 rounded mb-0.5"
            style={{ color: "#555" }}
          >
            <span>{label}</span>
            <span
              className="text-[8px] px-1.5 py-0.5 rounded"
              style={{ background: tagBg, color: tagColor }}
            >
              {tag}
            </span>
          </div>
        ))}
        <div
          className="text-[9px] font-semibold uppercase mt-3 mb-1.5"
          style={{ color: "#999", letterSpacing: "0.8px" }}
        >
          Tool Legacy
        </div>
        {legacyItems.map(({ label, tag, tagColor, tagBg, active }) => (
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
              style={{ background: tagBg, color: tagColor }}
            >
              {tag}
            </span>
          </div>
        ))}
      </div>

      {/* Main */}
      <div className="flex-1 p-4" style={{ background: "#fafafa" }}>
        <div className="text-[13px] font-bold mb-0.5" style={{ color: "#111" }}>
          AI Classifier — Discovery Engine
        </div>
        <div className="text-[10px] mb-3" style={{ color: "#777" }}>
          AST Analysis → Infrastructure Mapping → Art. 6(3) Decision Tree
        </div>
        <div className="flex gap-1 mb-3">
          {["Repository", "Discovery", "Art. 6(3)", "Certificato"].map((tab, i) => (
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
        <div className="text-[10px] font-semibold mb-2" style={{ color: "#333" }}>
          File Browser
        </div>
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
          {files.map(({ name, signals, color }) => (
            <div
              key={name}
              className="flex items-center justify-between px-3 py-1.5 text-[10px]"
              style={{ borderBottom: "1px solid #f3f4f6", color: "#374151" }}
            >
              <span>{name}</span>
              <span style={{ color, fontWeight: 600 }}>{signals}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div
        className="flex-shrink-0 p-3.5 flex flex-col gap-3"
        style={{ width: "175px", borderLeft: "1px solid #f0f0f0", background: "#fff" }}
      >
        <div>
          <div className="text-[11px] font-semibold mb-2" style={{ color: "#111" }}>
            Riepilogo Discovery
          </div>
          {[
            { label: "Librerie totali", value: "8", color: "#111" },
            { label: "Segnali critici", value: "1", color: "#dc2626" },
            { label: "Alta severità", value: "2", color: "#d97706" },
            { label: "Endpoint rischiosi", value: "1", color: "#dc2626" },
            { label: "Articoli mappati", value: "3", color: "#111" },
            { label: "Confidenza max", value: "95%", color: "#16a34a" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="flex justify-between items-center text-[10px] py-1"
              style={{ borderBottom: "1px solid #f5f5f5", color: "#555" }}
            >
              <span>{label}</span>
              <span style={{ fontWeight: 700, color }}>{value}</span>
            </div>
          ))}
        </div>

        {/* AI Risk Scorer — fixed layout */}
        <div
          className="rounded-lg p-2.5"
          style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
        >
          <div className="text-[9px] font-semibold mb-2" style={{ color: "#991b1b", letterSpacing: "0.5px" }}>
            AI RISK SCORER
          </div>
          {[
            { id: "PATTERN_BIO_001", score: "9.09%" },
            { id: "PATTERN_BIO_002", score: "10.0%" },
          ].map(({ id, score }) => (
            <div
              key={id}
              className="rounded-md p-1.5 mb-1.5"
              style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.12)" }}
            >
              <div className="text-[9px] font-mono mb-1" style={{ color: "#374151" }}>
                {id}
              </div>
              <div className="flex items-center justify-between">
                <span
                  className="text-[8px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: "#fca5a5", color: "#7f1d1d" }}
                >
                  Unacceptable
                </span>
                <span className="text-[9px] font-bold" style={{ color: "#dc2626" }}>
                  {score}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
