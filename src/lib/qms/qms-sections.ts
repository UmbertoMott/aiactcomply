// Aspetti del sistema di gestione della qualità — Art. 17(1), lettere a)-m), Reg. (UE) 2024/1689.
// Fuori dal file "use server" di draftQmsSection: un file di azioni server può esportare solo funzioni async.
export const QMS_SECTIONS = [
  { id: "a", label: "Strategia per la conformità normativa, comprese valutazione della conformità e gestione delle modifiche", article: "Art. 17(1)(a)" },
  { id: "b", label: "Tecniche, procedure e azioni per progettazione, controllo e verifica della progettazione", article: "Art. 17(1)(b)" },
  { id: "c", label: "Tecniche, procedure e azioni per sviluppo, controllo e garanzia della qualità", article: "Art. 17(1)(c)" },
  { id: "d", label: "Procedure di esame, prova e convalida prima, durante e dopo lo sviluppo", article: "Art. 17(1)(d)" },
  { id: "e", label: "Specifiche tecniche applicate, comprese le norme", article: "Art. 17(1)(e)" },
  { id: "f", label: "Sistemi e procedure per la gestione dei dati", article: "Art. 17(1)(f)" },
  { id: "g", label: "Sistema di gestione dei rischi (Art. 9)", article: "Art. 17(1)(g)" },
  { id: "h", label: "Monitoraggio successivo all'immissione sul mercato (Art. 72)", article: "Art. 17(1)(h)" },
  { id: "i", label: "Procedure per la segnalazione degli incidenti gravi (Art. 73)", article: "Art. 17(1)(i)" },
  { id: "j", label: "Comunicazione con autorità, organismi notificati, altri operatori e clienti", article: "Art. 17(1)(j)" },
  { id: "k", label: "Sistemi e procedure per la conservazione della documentazione", article: "Art. 17(1)(k)" },
  { id: "l", label: "Gestione delle risorse, comprese le misure per la sicurezza dell'approvvigionamento", article: "Art. 17(1)(l)" },
  { id: "m", label: "Quadro delle responsabilità della dirigenza e del personale", article: "Art. 17(1)(m)" },
] as const

export type QmsSectionId = typeof QMS_SECTIONS[number]["id"]
