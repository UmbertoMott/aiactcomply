// Public AI-Trust Passport Registry — verifica pubblica per clienti finali
// URL: /trust/passport/[id]?h=<hash>
// Senza login: chiunque (clienti, autorità, partner) può verificare il passport
// Mostra solo dati aggregati — nessuna info sensibile.

import { Suspense } from "react";
import Link from "next/link";
import { ShieldCheck, CheckCircle2, XCircle, ExternalLink, Award } from "lucide-react";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ h?: string }>;
}

export const metadata: Metadata = {
  title: "Verifica AI-Trust Passport — AIComply",
  description: "Verifica pubblica di un AI-Trust Passport rilasciato dalla piattaforma AIComply secondo standard EU AI Act.",
  robots: { index: false, follow: false },  // registro non indicizzato dai motori di ricerca
};

const T = {
  text:   "#0D1016",
  muted:  "rgba(255,255,255,0.6)",
  card:   "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  purple: "#8b5cf6",
  green:  "#22c55e",
  amber:  "#eab308",
};

export default async function PublicPassportPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { h } = await searchParams;

  // In produzione: query DB per recuperare passport pubblico
  // Per ora: validazione formale dell'ID + hash
  const isValidFormat = /^[a-f0-9]{16}$/i.test(id) && (!h || /^[a-f0-9]{16}$/i.test(h));

  return (
    <div style={{ minHeight: "100vh", background: "#0D1016", color: "#ffffff" }}>
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-6 h-6" style={{ color: T.purple }} />
          <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: T.purple }}>
            AIComply · Public Registry
          </span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Verifica AI-Trust Passport</h1>
        <p className="text-sm" style={{ color: T.muted }}>
          Registro pubblico delle dichiarazioni di affidabilità AI rilasciate secondo lo standard EU AI Act (Reg. UE 2024/1689).
        </p>

        {/* Status */}
        <div className="mt-8 rounded-2xl p-6"
          style={{
            background: isValidFormat ? "rgba(34,197,94,0.08)" : "rgba(220,38,38,0.08)",
            border: `1px solid ${isValidFormat ? "rgba(34,197,94,0.3)" : "rgba(220,38,38,0.3)"}`,
          }}>
          <div className="flex items-start gap-4">
            {isValidFormat
              ? <CheckCircle2 className="w-8 h-8 flex-shrink-0" style={{ color: T.green }} />
              : <XCircle className="w-8 h-8 flex-shrink-0" style={{ color: "#dc2626" }} />
            }
            <div>
              <p className="text-lg font-semibold mb-1" style={{ color: isValidFormat ? T.green : "#dc2626" }}>
                {isValidFormat ? "Identificatore valido" : "Identificatore non valido"}
              </p>
              <p className="text-sm" style={{ color: T.muted }}>
                {isValidFormat
                  ? "Il formato dell'identificatore corrisponde allo schema AIComply. Per la verifica completa contattare il fornitore del sistema o l'autorità di vigilanza."
                  : "L'ID fornito non rispetta il formato AIComply (deve essere una stringa esadecimale di 16 caratteri)."}
              </p>
            </div>
          </div>
        </div>

        {/* Identifiers */}
        <div className="mt-6 rounded-xl p-5"
          style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: T.muted }}>
            Identificatori
          </p>
          <div className="space-y-2">
            <div>
              <p className="text-[10px]" style={{ color: T.muted }}>System ID</p>
              <code className="text-xs">{id}</code>
            </div>
            {h && (
              <div>
                <p className="text-[10px]" style={{ color: T.muted }}>Verification Hash (prefix)</p>
                <code className="text-xs">{h}</code>
              </div>
            )}
            <div>
              <p className="text-[10px]" style={{ color: T.muted }}>Registry Standard</p>
              <code className="text-xs">AIComply Public Registry v1.0</code>
            </div>
          </div>
        </div>

        {/* Cosa il passport garantisce */}
        <div className="mt-6 rounded-xl p-5"
          style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: T.muted }}>
            Cosa garantisce un AI-Trust Passport
          </p>
          <ul className="space-y-2 text-sm" style={{ color: T.muted }}>
            <li className="flex items-start gap-2">
              <Award className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: T.purple }} />
              <span><strong style={{ color: "#fff" }}>Bias testato</strong> — il sistema AI è stato sottoposto ad audit di equità con metriche standard (OFI, SPD, DI, EOD)</span>
            </li>
            <li className="flex items-start gap-2">
              <Award className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: T.purple }} />
              <span><strong style={{ color: "#fff" }}>Rischi gestiti</strong> — è stato implementato un sistema di gestione del rischio Art. 9 EU AI Act</span>
            </li>
            <li className="flex items-start gap-2">
              <Award className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: T.purple }} />
              <span><strong style={{ color: "#fff" }}>Robustezza verificata</strong> — sono stati eseguiti test di accuracy e adversarial testing</span>
            </li>
            <li className="flex items-start gap-2">
              <Award className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: T.purple }} />
              <span><strong style={{ color: "#fff" }}>Trasparenza documentata</strong> — disclosure Art. 50 implementata verso utenti finali</span>
            </li>
          </ul>
        </div>

        {/* Cosa NON garantisce */}
        <div className="mt-6 rounded-xl p-5"
          style={{ background: "rgba(234,179,8,0.06)", border: `1px solid rgba(234,179,8,0.2)` }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: T.amber }}>
            ⚠ Cosa il Passport NON garantisce
          </p>
          <p className="text-xs leading-relaxed" style={{ color: T.muted }}>
            Il Passport è uno strumento di trasparenza B2B e non costituisce certificazione legale.
            Non sostituisce la documentazione tecnica obbligatoria Annex IV (Art. 11 AI Act),
            né la valutazione di conformità da parte di organismi notificati (Art. 43).
            Per ispezioni regolamentari, l'autorità di vigilanza (AGID, ACN, Garante Privacy)
            deve richiedere il dossier completo al fornitore.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: T.purple, color: "#fff" }}>
            Scopri AIComply
            <ExternalLink className="w-4 h-4" />
          </Link>
          <Link href="/risorse"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
            style={{ background: T.card, color: "#fff", border: `1px solid ${T.border}` }}>
            Risorse EU AI Act
          </Link>
        </div>

        {/* Footer */}
        <p className="text-[11px] mt-12 pt-6 border-t" style={{ color: T.muted, borderColor: T.border }}>
          AIComply Public Registry — registro pubblico delle dichiarazioni di affidabilità AI.
          Non costituisce database ufficiale UE (EUDB Art. 49), che resta gestito dalla Commissione Europea.
          I dati visualizzati sono aggregati e non espongono informazioni sensibili o segreti industriali.
        </p>
      </div>
    </div>
  );
}
