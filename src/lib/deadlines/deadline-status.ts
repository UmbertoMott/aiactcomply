// Logica di calcolo stato scadenza — riusa soglie PROMPT_N invariate
import type { DeadlineStatus } from "./deadline-types";

export function getDeadlineStatus(isoDate: string): DeadlineStatus {
  const now = new Date();
  const deadline = new Date(isoDate);
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);

  if (daysLeft < 0) return "passed";
  if (daysLeft <= 90) return "imminent";
  if (daysLeft <= 365) return "upcoming";
  return "future";
}

export function daysUntil(isoDate: string): number {
  const now = new Date();
  const deadline = new Date(isoDate);
  return Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
}

export const STATUS_COLOR: Record<DeadlineStatus, { dot: string; text: string; bg: string; border: string }> = {
  passed:   { dot: "#94A3B8", text: "#94A3B8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)" },
  imminent: { dot: "#DC2626", text: "#DC2626", bg: "rgba(220,38,38,0.08)",   border: "rgba(220,38,38,0.3)"   },
  upcoming: { dot: "#D97706", text: "#D97706", bg: "rgba(217,119,6,0.08)",   border: "rgba(217,119,6,0.25)"  },
  future:   { dot: "#3B82F6", text: "#3B82F6", bg: "rgba(59,130,246,0.06)",  border: "rgba(59,130,246,0.2)"  },
};
