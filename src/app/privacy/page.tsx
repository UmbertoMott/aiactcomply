import type { Metadata } from "next";
import LegalLayout from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Informativa sulla Privacy — RegulaeOS",
  description: "Informativa sul trattamento dei dati personali ai sensi del Regolamento UE 2016/679 (GDPR) da parte di RegulaeOS S.r.l.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Informativa sulla Privacy" lastUpdated="29 giugno 2026">
      <div className="legal-prose">

        <div className="legal-note">
          Informativa resa ai sensi degli artt. 13–14 del Regolamento (UE) 2016/679 (GDPR) e del d.lgs. 196/2003 come modificato dal d.lgs. 101/2018.
        </div>

        <h2>1. Titolare del trattamento</h2>
        <p>
          Il titolare del trattamento è <strong>RegulaeOS S.r.l.</strong>, con sede legale in [•], P.IVA [•],
          email: <a href="mailto:privacy@regulaeos.com">privacy@regulaeos.com</a>.
        </p>

        <h2>2. Dati raccolti e finalità</h2>
        <table>
          <thead>
            <tr>
              <th>Categoria di dato</th>
              <th>Finalità</th>
              <th>Base giuridica</th>
              <th>Conservazione</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Email, nome, azienda</td>
              <td>Registrazione e accesso al servizio</td>
              <td>Esecuzione contratto (art. 6.1.b GDPR)</td>
              <td>Fino alla cancellazione account + 12 mesi</td>
            </tr>
            <tr>
              <td>Dati di utilizzo (log, sessioni)</td>
              <td>Sicurezza, prevenzione frodi, debug</td>
              <td>Legittimo interesse (art. 6.1.f GDPR)</td>
              <td>90 giorni</td>
            </tr>
            <tr>
              <td>Cookie analitici</td>
              <td>Statistiche aggregate sull&apos;utilizzo</td>
              <td>Consenso (art. 6.1.a GDPR)</td>
              <td>13 mesi</td>
            </tr>
            <tr>
              <td>Contenuti inseriti nei tool (FRIA, DPIA, ecc.)</td>
              <td>Erogazione del servizio SaaS</td>
              <td>Esecuzione contratto (art. 6.1.b GDPR)</td>
              <td>Fino alla cancellazione account</td>
            </tr>
            <tr>
              <td>Dati di fatturazione</td>
              <td>Adempimenti fiscali e contabili</td>
              <td>Obbligo legale (art. 6.1.c GDPR)</td>
              <td>10 anni (normativa fiscale)</td>
            </tr>
          </tbody>
        </table>

        <h2>3. Modalità di trattamento</h2>
        <p>
          I dati sono trattati con strumenti automatizzati e manuali, adottando misure tecniche e organizzative
          adeguate (cifratura in transito TLS 1.3, cifratura a riposo, accesso con 2FA obbligatorio).
          I dati non vengono sottoposti a decisioni esclusivamente automatizzate ai sensi dell&apos;art. 22 GDPR.
        </p>

        <h2>4. Trasferimento a paesi terzi</h2>
        <p>
          I dati sono ospitati su infrastruttura <strong>Supabase</strong> (UE) e <strong>Vercel</strong>
          (con edge server in UE). Eventuali trasferimenti extra-UE avvengono nel rispetto delle
          Clausole Contrattuali Standard (SCC) approvate dalla Commissione Europea.
        </p>

        <h2>5. Responsabili del trattamento</h2>
        <p>
          Supabase Inc. (database), Vercel Inc. (hosting), provider di pagamento (stripe.com) operano come
          responsabili del trattamento ai sensi dell&apos;art. 28 GDPR, sulla base di contratti DPA conformi.
        </p>

        <h2>6. Diritti dell'interessato</h2>
        <p>Hai il diritto di:</p>
        <ul>
          <li>Accedere ai tuoi dati (art. 15 GDPR)</li>
          <li>Rettificarli (art. 16)</li>
          <li>Cancellarli («diritto all&apos;oblio», art. 17)</li>
          <li>Limitarne il trattamento (art. 18)</li>
          <li>Portabilità dei dati (art. 20)</li>
          <li>Opporti al trattamento (art. 21)</li>
          <li>Revocare il consenso in qualsiasi momento senza pregiudizio per la liceità del trattamento precedente</li>
        </ul>
        <p>
          Per esercitare i tuoi diritti scrivi a <a href="mailto:privacy@regulaeos.com">privacy@regulaeos.com</a>.
          Hai inoltre il diritto di proporre reclamo al Garante per la Protezione dei Dati Personali
          (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">www.garanteprivacy.it</a>).
        </p>

        <h2>7. Cookie</h2>
        <p>
          Per informazioni dettagliate sull&apos;uso dei cookie consulta la{" "}
          <a href="/cookie-policy">Cookie Policy</a>.
        </p>

        <h2>8. Modifiche</h2>
        <p>
          Questa informativa può essere aggiornata. In caso di modifiche sostanziali gli utenti registrati
          saranno notificati via email.
        </p>

      </div>
    </LegalLayout>
  );
}
