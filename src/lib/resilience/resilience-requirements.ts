// Art. 15 AI Act — accuratezza, robustezza, cybersicurezza.
// Citazioni centralizzate. [verify against current AI Act text] su ogni riferimento
// normativo; sigle prEN/ISO a memoria, conferma del legale prima del rilascio.

export const RESILIENCE_PILLARS = [
  { id: "accuracy",      label: "Accuratezza e metriche dichiarate",             reference: "Art. 15(3) [verify against current AI Act text]", linkedTool: "transparency",  linkedPath: "/dashboard/tools/transparency" },
  { id: "robustness",    label: "Robustezza (errori, guasti, OOD, feedback loop)", reference: "Art. 15(4) [verify against current AI Act text]", linkedTool: "risk-manager", linkedPath: "/dashboard/tools/risk-manager" },
  { id: "cybersecurity", label: "Cybersicurezza del sistema AI",                  reference: "Art. 15(5) [verify against current AI Act text]", linkedTool: "risk-manager", linkedPath: "/dashboard/tools/risk-manager" },
] as const;
export type ResiliencePillarId = (typeof RESILIENCE_PILLARS)[number]["id"];

// Categorie di minaccia — Art. 15(5) ↔ prEN 18282 [verify]
export const PREN18282_THREATS = [
  { id: "data_poisoning",      label: "Data poisoning (avvelenamento dati di training)",          generativeOnly: false, reference: "Art. 15(5) [verify] · prEN 18282 [verify]" },
  { id: "model_poisoning",     label: "Model poisoning / backdoor",                               generativeOnly: false, reference: "Art. 15(5) [verify] · prEN 18282 [verify]" },
  { id: "evasion_adversarial", label: "Adversarial examples / evasion",                           generativeOnly: false, reference: "Art. 15(5) [verify] · prEN 18282 [verify]" },
  { id: "prompt_injection",    label: "Prompt injection (sistemi generativi / GPAI)",             generativeOnly: true,  reference: "Art. 15(5) [verify] · prEN 18282 [verify]" },
  { id: "model_inversion",     label: "Model inversion / membership inference (confidenzialità)", generativeOnly: false, reference: "Art. 15(5) [verify] · prEN 18282 [verify]" },
  { id: "model_theft",         label: "Model extraction / theft",                                 generativeOnly: false, reference: "Art. 15(5) [verify] · prEN 18282 [verify]" },
] as const;
export type ThreatId = (typeof PREN18282_THREATS)[number]["id"];

// Voci di robustezza operativa — Art. 15(4)
export const ROBUSTNESS_ITEMS = [
  { id: "ood_degradation",  label: "Degrado sotto perturbazione / dati out-of-distribution", reference: "Art. 15(4) [verify against current AI Act text]" },
  { id: "fault_tolerance",  label: "Fault tolerance / ridondanza / fail-safe",               reference: "Art. 15(4) [verify against current AI Act text]" },
  { id: "feedback_loops",   label: "Misure contro i feedback loop (apprendimento continuo)",  reference: "Art. 15(4) [verify against current AI Act text]" },
] as const;
export type RobustnessItemId = (typeof ROBUSTNESS_ITEMS)[number]["id"];

// Mappatura ISO/EN (mostrata in UI)
export const RESILIENCE_ISO_MAP: readonly [string, string, string][] = [
  ["Cybersicurezza / minacce", "Art. 15(5)", "prEN 18282 (cybersecurity AI) [verify]"],
  ["Robustezza / qualità", "Art. 15(4)", "ISO/IEC 24029 (robustness NN); ISO/IEC 25059 [verify]"],
  ["Bias / sotto-popolazioni", "Art. 15 ↔ 10", "ISO/IEC TR 24027 (bias in AI) [verify]"],
  ["Gestione rischi collegata", "Art. 15 ↔ 9", "prEN 18228; ISO/IEC 23894 [verify]"],
  ["Sicurezza dell'informazione", "Art. 15(5)", "ISO/IEC 27001 [verify]"],
];

export const MIN_GROUP = 30;              // §4 campione minimo per sotto-gruppo
export const DEFAULT_GAP_THRESHOLD = 0.05; // §4 soglia maxGap
