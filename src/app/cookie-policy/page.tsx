import type { Metadata } from "next";
import LegalLayout from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Cookie Policy — RegulaeOS",
  description: "Informativa estesa sull'uso dei cookie e tecnologie di tracciamento su regulaeos.com, ai sensi del Provvedimento Garante 8 maggio 2014 e delle Linee Guida 2021.",
  robots: { index: true, follow: true },
};

export default function CookiePolicyPage() {
  return (
    <LegalLayout title="Cookie Policy" lastUpdated="29 giugno 2026">
      <div className="legal-prose">

        <div className="legal-note">
          Informativa estesa sui cookie ai sensi del Provvedimento Garante Privacy 8 maggio 2014,
          delle Linee Guida Cookie del 10 giugno 2021 e della Direttiva ePrivacy 2002/58/CE.
        </div>

        <h2>1. Cosa sono i cookie</h2>
        <p>
          I cookie sono piccoli file di testo salvati nel browser dell&apos;utente quando visita un sito web.
          Consentono al sito di ricordare le preferenze, mantenere la sessione di login e raccogliere
          informazioni statistiche sull&apos;utilizzo.
        </p>

        <h2>2. Categorie di cookie utilizzati</h2>

        <h3>2.1 Cookie tecnici / necessari</h3>
        <p>
          Indispensabili per il funzionamento del sito. Non richiedono consenso.
        </p>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Scopo</th>
              <th>Durata</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>sb-*-auth-token</code></td>
              <td>Sessione di autenticazione Supabase</td>
              <td>7 giorni</td>
              <td>HttpOnly, Secure</td>
            </tr>
            <tr>
              <td><code>sidebar_collapsed</code></td>
              <td>Preferenza UI sidebar dashboard</td>
              <td>Persistente (localStorage)</td>
              <td>Locale</td>
            </tr>
            <tr>
              <td><code>theme</code></td>
              <td>Preferenza tema chiaro/scuro</td>
              <td>Persistente (localStorage)</td>
              <td>Locale</td>
            </tr>
            <tr>
              <td><code>regulaeos_cookie_consent</code></td>
              <td>Memorizzazione preferenze cookie</td>
              <td>12 mesi (localStorage)</td>
              <td>Locale</td>
            </tr>
          </tbody>
        </table>

        <h3>2.2 Cookie analitici</h3>
        <p>
          Raccolgono dati aggregati e anonimi sull&apos;utilizzo del sito (pagine visitate, durata sessione,
          sorgente di traffico). Richiedono consenso esplicito.
        </p>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Provider</th>
              <th>Scopo</th>
              <th>Durata</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>_va_*</code></td>
              <td>Vercel Analytics</td>
              <td>Statistiche aggregate anonime sul traffico</td>
              <td>Session / 24h</td>
            </tr>
          </tbody>
        </table>
        <p>
          Vercel Analytics è configurato in modalità privacy-friendly: non raccoglie IP completi
          né fingerprint identificativi. I dati sono aggregati e non consentono l&apos;identificazione dell&apos;utente.
        </p>

        <h3>2.3 Cookie di marketing</h3>
        <p>
          Attualmente RegulaeOS <strong>non utilizza cookie di marketing o retargeting</strong>.
          Se in futuro venissero adottati, l&apos;informativa sarà aggiornata e il consenso richiesto separatamente.
        </p>

        <h2>3. Cookie di terze parti</h2>
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Scopo</th>
              <th>Privacy Policy</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Supabase</td>
              <td>Autenticazione e database</td>
              <td><a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">supabase.com/privacy</a></td>
            </tr>
            <tr>
              <td>Stripe</td>
              <td>Pagamenti</td>
              <td><a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">stripe.com/privacy</a></td>
            </tr>
            <tr>
              <td>Vercel</td>
              <td>Hosting e analytics</td>
              <td><a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">vercel.com/legal/privacy-policy</a></td>
            </tr>
          </tbody>
        </table>

        <h2>4. Come gestire i cookie</h2>
        <p>
          Puoi modificare le tue preferenze in qualsiasi momento tramite il pulsante{" "}
          <strong>«Impostazioni cookie»</strong> nel footer del sito.
        </p>
        <p>
          Puoi inoltre disabilitare i cookie direttamente dal browser:
        </p>
        <ul>
          <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
          <li><a href="https://support.mozilla.org/kb/enable-and-disable-cookies-website-preferences" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
          <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471" target="_blank" rel="noopener noreferrer">Apple Safari</a></li>
          <li><a href="https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
        </ul>
        <p>
          La disabilitazione dei cookie tecnici può compromettere il corretto funzionamento del servizio.
        </p>

        <h2>5. Contatti</h2>
        <p>
          Per qualsiasi domanda relativa ai cookie: <a href="mailto:privacy@regulaeos.com">privacy@regulaeos.com</a>.
        </p>

      </div>
    </LegalLayout>
  );
}
