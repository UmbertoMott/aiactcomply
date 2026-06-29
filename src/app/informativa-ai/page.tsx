import type { Metadata } from "next";
import LegalLayout from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Informativa sull'uso dell'AI — RegulaeOS",
  description: "Informativa trasparenza sull'utilizzo di sistemi di intelligenza artificiale nella piattaforma RegulaeOS, ai sensi dell'art. 50 EU AI Act.",
  robots: { index: true, follow: true },
};

export default function InformativaAIPage() {
  return (
    <LegalLayout title="Informativa sull'uso dell'AI" lastUpdated="29 giugno 2026">
      <div className="legal-prose">

        <div className="legal-note">
          Trasparenza ai sensi dell&apos;art. 50 del Regolamento (UE) 2024/1689 («EU AI Act»).
          RegulaeOS integra sistemi di AI generativa per supportare la compliance normativa.
        </div>

        <h2>1. Sistemi AI utilizzati nella piattaforma</h2>
        <table>
          <thead>
            <tr>
              <th>Componente</th>
              <th>Funzione</th>
              <th>Modello / Provider</th>
              <th>Classificazione rischio</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Legal Assistant</strong></td>
              <td>Risposte in linguaggio naturale su EU AI Act, ISO 22989, Guidelines</td>
              <td>LLM via API (RAG su fonti normative)</td>
              <td>Limitato — Art. 50 AI Act</td>
            </tr>
            <tr>
              <td><strong>Pre-compilazione FRIA/DPIA</strong></td>
              <td>Suggerimenti automatici per sezioni del fascicolo tecnico</td>
              <td>LLM via API</td>
              <td>Limitato — Art. 50 AI Act</td>
            </tr>
            <tr>
              <td><strong>Triage classificazione</strong></td>
              <td>Classificazione del livello di rischio del sistema AI descritto dall&apos;utente</td>
              <td>Logica rule-based + LLM di supporto</td>
              <td>Limitato — Art. 50 AI Act</td>
            </tr>
          </tbody>
        </table>

        <h2>2. Limitazioni e disclaimer</h2>
        <p>
          I sistemi AI integrati in RegulaeOS sono strumenti di <strong>supporto operativo</strong>,
          non sistemi decisionali autonomi. In particolare:
        </p>
        <ul>
          <li>
            Le risposte del Legal Assistant sono generate sulla base di fonti normative indicizzate
            (EU AI Act, ISO 22989, EDPB Guidelines) ma <strong>non sostituiscono il parere di un legale qualificato</strong>.
          </li>
          <li>
            I suggerimenti di pre-compilazione richiedono sempre revisione e validazione da parte dell&apos;utente
            prima dell&apos;uso ufficiale.
          </li>
          <li>
            La classificazione del rischio è un risultato orientativo: la decisione finale spetta all&apos;azienda
            e ai suoi consulenti.
          </li>
          <li>
            I modelli AI possono produrre output imprecisi o non aggiornati («allucinazioni»).
            RegulaeOS non garantisce l&apos;assenza di errori.
          </li>
        </ul>

        <h2>3. Supervisione umana</h2>
        <p>
          Ogni output AI presentato nella piattaforma è chiaramente etichettato come generato da AI
          e richiede conferma esplicita dell&apos;utente prima di essere salvato o esportato.
          Il sistema non prende decisioni giuridicamente vincolanti in modo automatico.
        </p>

        <h2>4. Dati usati per l'AI</h2>
        <p>
          I contenuti inseriti dall&apos;utente nei tool (es. descrizione del sistema AI, rischi, misure)
          possono essere inviati a provider AI terzi (es. API OpenAI o Anthropic) per la generazione
          delle risposte. Tali dati vengono trattati come descritto nell&apos;<a href="/privacy">Informativa Privacy</a>{" "}
          e non sono utilizzati per addestrare modelli di terzi, in virtù delle condizioni contrattuali
          (data processing agreements) stipulate con i provider.
        </p>

        <h2>5. Monitoraggio e aggiornamento</h2>
        <p>
          RegulaeOS monitora continuamente le performance dei componenti AI e aggiorna
          fonti e modelli alla pubblicazione di nuove versioni dei regolamenti e delle linee guida.
          Eventuali cambiamenti significativi sono comunicati tramite changelog e notifiche in-app.
        </p>

        <h2>6. Contatti</h2>
        <p>
          Per segnalazioni relative al comportamento dei sistemi AI o per richiedere maggiori informazioni:
          {" "}<a href="mailto:ai@regulaeos.com">ai@regulaeos.com</a>.
        </p>

      </div>
    </LegalLayout>
  );
}
