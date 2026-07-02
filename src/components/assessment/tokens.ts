import type { CSSProperties } from "react";

export const T = {
  text: "#0D1016", muted: "rgba(0,0,0,0.42)", faint: "rgba(0,0,0,0.28)",
  border: "rgba(0,0,0,0.08)", card: "#ffffff", bg: "#f8f8f7",
  red: "#dc2626", redBg: "rgba(220,38,38,0.06)", redBdr: "rgba(220,38,38,0.2)",
  amber: "#d97706", amberBg: "rgba(202,138,4,0.06)", amberBdr: "rgba(202,138,4,0.2)",
  green: "#16a34a", greenBg: "rgba(22,163,74,0.06)", greenBdr: "rgba(22,163,74,0.2)",
} as const;

export const inputSt: CSSProperties = {
  width: "100%", padding: "7px 10px", borderRadius: 6,
  border: `1px solid ${T.border}`, fontSize: 12, color: T.text,
  background: T.card, outline: "none", boxSizing: "border-box",
};

export const textareaSt: CSSProperties = {
  ...inputSt, resize: "vertical" as const, minHeight: 80,
};

export const selectSt: CSSProperties = {
  ...inputSt, cursor: "pointer",
};

export const labelSt: CSSProperties = {
  fontSize: 11, fontWeight: 600, color: T.muted,
  textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 4,
};
