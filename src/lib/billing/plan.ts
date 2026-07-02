// src/lib/billing/plan.ts
// Piano di abbonamento corrente + limiti membri per progetto.
// Nota: nessun backend di billing ancora — il piano è salvato in localStorage
// e impostabile dalla pagina Fatturazione. Guida il gating dei membri.

export type PlanId = "essenziale" | "studio" | "sumisura";

export interface PlanMeta {
  id: PlanId;
  label: string;
  price: string;
  /** Membri aggiuntivi invitabili oltre al proprietario (te). */
  maxMembers: number;
  /** true quando il limite è "5 o più" (Su misura). */
  openEnded?: boolean;
}

export const PLAN_META: Record<PlanId, PlanMeta> = {
  essenziale: { id: "essenziale", label: "Essenziale", price: "€49/mese",  maxMembers: 0 },
  studio:     { id: "studio",     label: "Studio",     price: "€149/mese", maxMembers: 3 },
  sumisura:   { id: "sumisura",   label: "Su misura",  price: "Su misura", maxMembers: 5, openEnded: true },
};

const PLAN_KEY   = "aicomply_plan";
const PLAN_EVENT = "aicomply:planchanged";
const DEFAULT_PLAN: PlanId = "studio";

export function getPlan(): PlanId {
  if (typeof window === "undefined") return DEFAULT_PLAN;
  const raw = localStorage.getItem(PLAN_KEY);
  if (raw === "essenziale" || raw === "studio" || raw === "sumisura") return raw;
  return DEFAULT_PLAN;
}

export function setPlan(id: PlanId): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLAN_KEY, id);
  window.dispatchEvent(new Event(PLAN_EVENT));
}

export function getPlanMeta(): PlanMeta {
  return PLAN_META[getPlan()];
}

export const PLAN_EVENT_NAME = PLAN_EVENT;
