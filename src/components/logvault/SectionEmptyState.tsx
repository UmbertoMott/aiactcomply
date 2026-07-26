// Empty-state riutilizzabile per le sezioni calcolate di LogVault (pre-upload).
// Solo presentazione: nessuna logica di calcolo.

export function SectionEmptyState({ message }: { message: string }) {
  return (
    <div style={{
      borderRadius: 12,
      border: "1px dashed rgba(0,0,0,0.18)",
      background: "rgba(0,0,0,0.02)",
      padding: "28px 24px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 22, color: "rgba(0,0,0,0.3)", marginBottom: 6, lineHeight: 1 }}>↥</div>
      <p style={{ fontSize: 13, color: "rgba(0,0,0,0.5)" }}>{message}</p>
      <p style={{ fontSize: 11, color: "rgba(0,0,0,0.38)", marginTop: 4 }}>
        Le metriche vengono calcolate localmente dopo l&rsquo;import — nessun dato grezzo viene salvato.
      </p>
    </div>
  );
}
