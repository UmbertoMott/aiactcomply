"use server"
import { generateText } from "@/lib/rag/rag-vertex"

const VIOLATION_DESCRIPTIONS: Record<string, string> = {
  emotion_recognition_workplace: "monitoraggio delle emozioni dei lavoratori in contesto lavorativo o educativo",
  social_scoring: "sistema di scoring sociale basato su comportamento delle persone fisiche da parte di autorità pubbliche",
  subliminal_manipulation: "tecniche subliminali o ingannevoli per distorcere il comportamento delle persone",
  real_time_biometric: "identificazione biometrica real-time in spazi pubblici accessibili per scopi di law enforcement",
  predictive_policing: "valutazione del rischio di commissione di reati basata su caratteristiche personali (polizia predittiva)",
  vulnerability_exploitation: "sfruttamento di vulnerabilità legate a età, disabilità o condizione socioeconomica",
}

export async function generateViolationMessage(
  violationType: string,
  systemName: string
): Promise<string> {
  const desc = VIOLATION_DESCRIPTIONS[violationType] ?? violationType

  const prompt = `Sei il guardrail normativo di AIComply, una piattaforma di compliance EU AI Act.
Un utente ha descritto un sistema che include: "${desc}" per il sistema "${systemName}".

Scrivi UN SOLO paragrafo (massimo 3 frasi) che:
1. Spiega chiaramente perché questa pratica viola l'Art. 5 EU AI Act — cita l'articolo specifico (es. Art. 5(1)(b))
2. Usa un tono diretto e professionale, senza burocrazia
3. Suggerisci in 1 frase una possibile alternativa conforme
4. NON menzionare le sanzioni (sono già indicate nel banner)

Scrivi solo in italiano. Solo il paragrafo, nessuna introduzione o conclusione.`

  try {
    const text = await generateText(prompt, { temperature: 0.3, maxOutputTokens: 200 })
    return text.trim()
  } catch {
    return `Questa pratica viola direttamente l'Art. 5 EU AI Act. Il sistema non può essere messo in servizio nell'UE con questa funzionalità attiva. Rimuovi la funzione o ridisegna il sistema in modo da escluderla completamente.`
  }
}
