// src/components/compliance/PrefilledBadge.tsx
// Reusable badge shown next to fields or sections that were pre-populated from another tool

export function PrefilledBadge({ source }: { source: string }) {
  return (
    <span style={{
      display: "inline-block",
      fontSize: 10,
      background: "rgba(217,119,6,0.08)",
      color: "#d97706",
      border: "1px solid rgba(217,119,6,0.2)",
      borderRadius: 4,
      padding: "1px 7px",
      marginLeft: 8,
      fontWeight: 500,
      letterSpacing: "0.01em",
    }}>
      Pre-compilato da {source}
    </span>
  );
}
