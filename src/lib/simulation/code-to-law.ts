export interface CodeToLawEntry {
  pattern: RegExp;
  article: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "info";
}

export const CODE_TO_LAW_MAP: CodeToLawEntry[] = [
  { pattern: /face_recognition|deepface|mediapipe|dlib/i, article: "Art. 5(1)(d)", title: "Pratiche vietate", description: "Identificazione biometrica remota in tempo reale in spazi accessibili al pubblico", severity: "critical" },
  { pattern: /social.?credit|social.?scoring/i, article: "Art. 5(1)(c)", title: "Social scoring", description: "Valutazione o classificazione di persone basata sul comportamento sociale", severity: "critical" },
  { pattern: /exploit.*vulnerab|subliminal|manipulat/i, article: "Art. 5(1)(a)", title: "Tecniche manipolative", description: "Tecniche subliminali che alterano il comportamento in modo dannoso", severity: "critical" },
  { pattern: /cv|resume|curriculum|screening|hiring|candidate/i, article: "Art. 6(2) + Allegato III, punto 4", title: "Occupazione e gestione lavoratori", description: "Sistemi utilizzati per assunzione, valutazione o promozione", severity: "high" },
  { pattern: /credit.?score|loan|mortgage|insurance.?risk/i, article: "Art. 6(2) + Allegato III, punto 5", title: "Accesso a servizi essenziali", description: "Valutazione della solvibilità e credit scoring", severity: "high" },
  { pattern: /student|exam|grade|admission|education/i, article: "Art. 6(2) + Allegato III, punto 3", title: "Istruzione e formazione professionale", description: "Accesso all'istruzione o valutazione degli studenti", severity: "high" },
  { pattern: /employee|worker|perform|productivity|monitor/i, article: "Art. 6(2) + Allegato III, punto 4(b)", title: "Monitoraggio lavoratori", description: "Valutazione delle prestazioni e monitoraggio dei lavoratori", severity: "high" },
  { pattern: /predict|predict_proba|classifier|classify/i, article: "Art. 9", title: "Gestione dei rischi", description: "Sistemi di classificazione che impattano diritti delle persone", severity: "high" },
  { pattern: /train|fit|learn|train_test/i, article: "Art. 10", title: "Governance dei dati", description: "Addestramento su dati personali — requisiti di qualità e rappresentatività", severity: "high" },
  { pattern: /pandas\.read|csv|excel|database/i, article: "Art. 10(2)", title: "Data governance", description: "Esame della provenienza dei dati e possibili distorsioni", severity: "info" },
  { pattern: /random_state|seed|shuffle|train_test_split/i, article: "Art. 10(4)", title: "Rappresentatività statistica", description: "I dataset devono essere pertinenti e rappresentativi", severity: "info" },
  { pattern: /chatbot|conversation|chat|dialogue/i, article: "Art. 50(1)", title: "Trasparenza", description: "Obbligo di informare l'utente che interagisce con un sistema AI", severity: "medium" },
  { pattern: /deepfake|synthetic|generat|gpt|llm|diffus/i, article: "Art. 50(2)", title: "Marcatura contenuti", description: "I contenuti generati artificialmente devono essere marcati", severity: "medium" },
  { pattern: /profiling|cluster|segment|personali|target/i, article: "Art. 6(3)", title: "Profilazione", description: "Divieto di esenzione se il sistema effettua profilazione di persone", severity: "high" },
];

export function matchCodeToLaw(code: string): CodeToLawEntry[] {
  const matches: CodeToLawEntry[] = [];
  for (const entry of CODE_TO_LAW_MAP) {
    if (entry.pattern.test(code)) {
      matches.push(entry);
    }
  }
  return matches;
}
