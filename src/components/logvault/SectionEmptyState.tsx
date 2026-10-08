// Empty-state riutilizzabile per le sezioni calcolate di LogVault (pre-upload).
// Solo presentazione: nessuna logica di calcolo.

export function SectionEmptyState({ message }: { message: string }) {
  return (
    <div style={{
      borderRadius: 8,
      border: "1px dashed rgba(0,0,0,0.18)",
      background: "#FAFAF9",
      padding: "28px 24px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 22, color: "#0D1016", marginBottom: 6, lineHeight: 1 }}>↥</div>
      <p style={{ fontSize: 13, color: "#0D1016" }}>{message}</p>
      <p style={{ fontSize: 11, color: "#0D1016", marginTop: 4 }}>
        Le metriche vengono calcolate localmente dopo l&rsquo;import — nessun dato grezzo viene salvato.
      </p>
    </div>
  );
}
