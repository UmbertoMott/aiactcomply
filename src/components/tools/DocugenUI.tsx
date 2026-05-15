const sections = [
  "Specifiche di progettazione sistema",
  "Architettura e algoritmo del sistema",
  "Dati di addestramento e governance",
  "Misure di sorveglianza umana",
  "Metriche di accuratezza e robustezza",
  "Gestione dei rischi e misure adottate",
  "Modifiche e versioning del sistema",
  "Elenco norme armonizzate applicate",
];

export default function DocugenUI() {
  return (
    <div className="h-full p-3.5 pointer-events-none select-none" style={{ background: "#fafafa", minHeight: "484px" }}>
      <div className="text-[13px] font-bold mb-0.5">DocuGen AI</div>
      <div className="text-[10px] mb-3" style={{ color: "#777" }}>
        Generatore documentazione tecnica conforme Art. 11 e Allegato IV
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { val: "1", label: "Sezioni" },
          { val: "0", label: "Completate" },
          { val: "11", label: "Template" },
        ].map(({ val, label }) => (
          <div
            key={label}
            className="rounded-lg p-2"
            style={{ background: "#fff", border: "1px solid #e5e7eb" }}
          >
            <div className="text-[18px] font-bold" style={{ letterSpacing: "-1px", color: "#111" }}>
              {val}
            </div>
            <div className="text-[9px]" style={{ color: "#888" }}>
              {label}
            </div>
          </div>
        ))}
        <div
          className="rounded-lg p-2 flex items-center justify-center"
          style={{ background: "#fff", border: "1px solid #e5e7eb" }}
        >
          <div
            className="text-[10px] font-semibold px-2 py-1 rounded-md"
            style={{ background: "#eef2ff", color: "#4f46e5", border: "1px solid #c7d2fe" }}
          >
            Esporta PDF
          </div>
        </div>
      </div>

      {/* Sections grid */}
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {sections.map((s) => (
          <div
            key={s}
            className="text-[10px] px-2.5 py-1.5 rounded-md"
            style={{ background: "#fff", border: "1px solid #e5e7eb", color: "#374151" }}
          >
            {s}
          </div>
        ))}
      </div>

      {/* Active section */}
      <div
        className="rounded-lg p-2.5"
        style={{ background: "#fff", border: "1px solid #e5e7eb" }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold" style={{ color: "#111" }}>
            Descrizione generale del sistema AI
          </span>
          <span
            className="text-[9px] px-2 py-0.5 rounded"
            style={{ background: "#f3f4f6", color: "#6b7280" }}
          >
            In bozza
          </span>
        </div>
        <div
          className="w-full rounded px-2 py-1.5 text-[10px] italic"
          style={{
            background: "#fafafa",
            border: "1px solid #e5e7eb",
            color: "#9ca3af",
          }}
        >
          Inserisci il contenuto della sezione...
        </div>
      </div>
    </div>
  );
}
