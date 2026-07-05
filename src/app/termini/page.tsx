import type { Metadata } from "next";
import LegalLayout from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Termini e Condizioni — RegulaeOS",
  description: "Termini e condizioni di utilizzo della piattaforma RegulaeOS per la conformità EU AI Act.",
  robots: { index: true, follow: true },
};

export default function TerminiPage() {
  return (
    <LegalLayout title="Termini e Condizioni" lastUpdated="29 giugno 2026">
      <div className="legal-prose">

        <div className="legal-note">
          Leggere attentamente prima di utilizzare la piattaforma RegulaeOS. L&apos;utilizzo del servizio implica l&apos;accettazione integrale dei presenti Termini.
        </div>

        <h2>1. Definizioni</h2>
        <p>
          <strong>«Servizio»</strong> indica il servizio di assistenza professionale alla conformità AI Act erogato
          tramite la piattaforma RegulaeOS, accessibile su regulaeos.com e relativi sottodomini.{" "}
          <strong>«Strumento»</strong> indica il software RegulaeOS, utilizzato come mezzo per l&apos;erogazione del Servizio.{" "}
          <strong>«Utente»</strong> indica qualsiasi persona fisica o giuridica che accede al Servizio.{" "}
          <strong>«Account»</strong> indica il profilo utente creato al momento della registrazione.{" "}
          <strong>«Dati dell&apos;Utente»</strong> indica qualsiasi contenuto caricato o generato dall&apos;Utente tramite il Servizio.
        </p>

        <h2>2. Oggetto del contratto</h2>
        <p>
          Il Servizio consiste nell&apos;assistenza professionale alla conformità al Regolamento (UE) 2024/1689 («EU AI Act»)
          e alla normativa correlata (GDPR, ISO 42001, ecc.), erogata dall&apos;<strong>Avv. Umberto Mottola</strong>,
          iscritto all&apos;Ordine degli Avvocati di Napoli, nell&apos;esercizio della professione forense e nel rispetto
          del codice deontologico. Il canone mensile è corrispettivo di tale assistenza. Lo Strumento (software RegulaeOS)
          è il mezzo tecnico con cui l&apos;assistenza è resa; la sua messa a disposizione è accessoria e strumentale
          all&apos;erogazione del Servizio, non ne costituisce l&apos;oggetto principale.
        </p>
        <p>
          <strong>Gli output automatici dello Strumento hanno natura assistiva</strong> e non costituiscono di per sé
          parere o consulenza legale finché non sono verificati e validati dall&apos;avvocato; i riferimenti normativi
          devono essere confrontati col testo normativo vigente [verifica contro il testo vigente].{" "}
          L&apos;assistenza, la revisione e la validazione degli assessment sono rese dall&apos;avvocato nell&apos;esercizio
          della professione: a questo livello si applicano il rapporto professionale e le relative tutele.
        </p>

        <h2>3. Registrazione e account</h2>
        <ul>
          <li>L&apos;Utente deve fornire informazioni veritiere e mantenerle aggiornate.</li>
          <li>È vietato condividere le credenziali di accesso con terzi.</li>
          <li>L&apos;Utente è responsabile di tutte le attività svolte tramite il proprio Account.</li>
          <li>RegulaeOS si riserva il diritto di sospendere o cancellare account in caso di violazione dei presenti Termini.</li>
        </ul>

        <h2>4. Canone di assistenza e piani</h2>
        <p>
          Il corrispettivo versato dall&apos;Utente è un <strong>canone di assistenza professionale</strong> per il Servizio
          descritto all&apos;art. 2. La messa a disposizione dello Strumento software è compresa nel canone in quanto
          accessoria all&apos;erogazione del Servizio; non costituisce licenza software autonoma né l&apos;oggetto principale
          del contratto.
        </p>
        <table>
          <thead>
            <tr>
              <th>Piano</th>
              <th>Caratteristiche principali</th>
              <th>Rinnovo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Essenziale</strong></td>
              <td>Assistenza su 1 sistema AI, Triage, Scanner Art. 50, Risk Register, assessment validati</td>
              <td>Mensile automatico</td>
            </tr>
            <tr>
              <td><strong>Studio</strong></td>
              <td>Tutti i moduli (Risk Register, FRIA, DPIA), parere su richiesta, dossier firmato</td>
              <td>Mensile automatico</td>
            </tr>
            <tr>
              <td><strong>Su Misura</strong></td>
              <td>Più sistemi seguiti, workspace multipli, Rappresentante Autorizzato (Art. 22), SLA</td>
              <td>Su accordo</td>
            </tr>
          </tbody>
        </table>
        <p>
          I prezzi sono in euro IVA esclusa. Il pagamento avviene tramite Stripe. Il canone si rinnova automaticamente
          salvo disdetta con 7 giorni di preavviso. Non è previsto rimborso per il periodo già fatturato, salvo quanto
          previsto dal Codice del Consumo per i consumatori (recesso entro 14 giorni dall&apos;attivazione).
        </p>

        <h2>5. Proprietà intellettuale</h2>
        <p>
          RegulaeOS detiene tutti i diritti sulla piattaforma, il software, i modelli AI e i contenuti editoriali.
          L&apos;Utente mantiene la proprietà dei propri Dati e concede a RegulaeOS una licenza limitata, non esclusiva,
          per l&apos;erogazione del Servizio.
        </p>

        <h2>6. Limitazione di responsabilità</h2>
        <p>
          Il Servizio è fornito «così com&apos;è». RegulaeOS non garantisce che i documenti generati siano
          conformi agli standard richiesti da autorità specifiche né che l&apos;interpretazione normativa
          incorporata nel software sia aggiornata in tempo reale rispetto all&apos;evoluzione legislativa.
        </p>
        <p>
          Nei limiti consentiti dalla legge, la responsabilità complessiva di RegulaeOS non potrà superare
          l&apos;importo pagato dall&apos;Utente nei 3 mesi precedenti all&apos;evento che ha dato origine alla pretesa.
        </p>

        <h2>7. Uso accettabile</h2>
        <p>È vietato utilizzare il Servizio per:</p>
        <ul>
          <li>Attività illegali o contrarie all&apos;ordine pubblico</li>
          <li>Accesso non autorizzato a sistemi terzi</li>
          <li>Reverse engineering della piattaforma</li>
          <li>Rivendita o sublicenza non autorizzata</li>
        </ul>

        <h2>8. Sospensione e risoluzione</h2>
        <p>
          L&apos;Utente può cancellare l&apos;account in qualsiasi momento dalla sezione Fatturazione.
          RegulaeOS può sospendere o risolvere il contratto in caso di violazione dei presenti Termini,
          mancato pagamento, o per ragioni tecniche o di sicurezza, con preavviso ove possibile.
        </p>
        <p>
          In caso di cancellazione, i Dati dell&apos;Utente saranno conservati per 30 giorni per consentire
          l&apos;esportazione, dopodiché saranno eliminati definitivamente.
        </p>

        <h2>9. Legge applicabile e foro competente</h2>
        <p>
          I presenti Termini sono regolati dalla legge italiana. Per i consumatori si applica la
          giurisdizione del tribunale del luogo di residenza. Per le imprese, il foro competente
          esclusivo è quello di [•].
        </p>

        <h2>10. Modifiche ai Termini</h2>
        <p>
          RegulaeOS si riserva il diritto di modificare i presenti Termini con preavviso di almeno 30 giorni
          via email. L&apos;utilizzo continuato del Servizio dopo tale periodo costituisce accettazione delle modifiche.
        </p>

      </div>
    </LegalLayout>
  );
}
