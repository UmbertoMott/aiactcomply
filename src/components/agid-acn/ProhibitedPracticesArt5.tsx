"use client";

import { useState } from "react";
import { AlertOctagon, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Design tokens (allineati alla pagina AGID/ACN) ──────────────────────────
const T = {
  text:    "#0D1016",
  muted:   "rgba(0,0,0,0.45)",
  faint:   "rgba(0,0,0,0.28)",
  border:  "rgba(0,0,0,0.07)",
  card:    "#ffffff",
  // Rosso tenue per il divieto (unico colore semantico reale ammesso)
  red:     "#dc2626",
  redBg:   "rgba(220,38,38,0.05)",
  redBdr:  "rgba(220,38,38,0.18)",
  rowBg:   "rgba(0,0,0,0.02)",
};

const MONO: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: 10,
  letterSpacing: "0.04em",
};

// ─── Le 8 fattispecie vietate — Art. 5(1)(a–h) EU AI Act 2024/1689 ───────────

const PRACTICES = [
  {
    letter: "a",
    title: "Manipolazione subliminale",
    summary: "Tecniche sublimali o ingannevoli che alterano il comportamento senza che la persona ne sia consapevole.",
    description:
      "Vietato immettere sul mercato, mettere in servizio o usare un sistema AI che impiega tecniche sublimali al di sotto della soglia di consapevolezza, oppure tecniche di manipolazione o inganno intenzionale, con l'obiettivo o l'effetto di distorcere materialmente il comportamento di una persona alterandone la capacità di prendere una decisione informata.",
    example:
      "Un assistente virtuale che inserisce messaggi persuasivi impercettibili nell'audio per indurre acquisti; un'app di welfare che usa nudge nascosti per scoraggiare la richiesta di sussidi.",
    who_is_at_risk: "Provider di sistemi conversazionali, piattaforme di raccomandazione, sistemi di pricing dinamico.",
    reference: "Art. 5(1)(a) EU AI Act",
  },
  {
    letter: "b",
    title: "Sfruttamento delle vulnerabilità",
    summary: "Sistemi che sfruttano l'età, la disabilità o la condizione socio-economica per distorcere il comportamento.",
    description:
      "Vietato usare AI che sfrutta le vulnerabilità di persone fisiche dovute a età (minori o anziani), disabilità o situazione socio-economica specifica, con l'obiettivo o l'effetto di distorcere materialmente il loro comportamento causando o rischiando di causare danno significativo.",
    example:
      "Un sistema di credito al consumo che rileva utenti in difficoltà economica e propone offerte predatorie con tassi elevati; app di gioco d'azzardo che targettizza utenti con segnali di dipendenza.",
    who_is_at_risk: "Fintech, e-commerce, piattaforme di gioco, app per anziani o minori.",
    reference: "Art. 5(1)(b) EU AI Act",
  },
  {
    letter: "c",
    title: "Social scoring da enti pubblici",
    summary: "Valutazione o classificazione di persone basata su comportamento sociale o caratteristiche personali nel tempo.",
    description:
      "Vietato l'uso di AI da parte di autorità pubbliche (o per loro conto) per valutare o classificare persone fisiche in base al loro comportamento sociale o caratteristiche personali in un periodo di tempo, se il punteggio porta a trattamento sfavorevole in contesti non correlati all'origine dei dati o a trattamento ingiustificato o sproporzionato.",
    example:
      "Un sistema che combina dati di pagamento, trasporto, sanità e social media per assegnare un 'punteggio civico' e negare l'accesso a servizi pubblici.",
    who_is_at_risk: "PA, aziende fornitrici di sistemi per la pubblica amministrazione, operatori di servizi pubblici.",
    reference: "Art. 5(1)(c) EU AI Act",
  },
  {
    letter: "d",
    title: "Valutazione del rischio di recidiva basata solo su profiling",
    summary: "Sistemi che prevedono la probabilità di commissione di un reato basandosi solo sul profilo della persona.",
    description:
      "Vietato usare AI per valutare il rischio che una persona fisica commetta un reato basandosi esclusivamente sul suo profilo o sulle sue caratteristiche e tratti personali (predictive policing puro). Eccezione: sistemi a supporto della valutazione umana di coinvolgimento in attività criminali già basata su fatti obiettivi e verificabili direttamente legati all'attività criminale.",
    example:
      "Software che analizza età, provenienza, reddito, storico familiare e assegna un 'crime score' per decidere la detenzione preventiva o il perimetro di pattugliamento.",
    who_is_at_risk: "Fornitori di soluzioni per forze dell'ordine, software predittivo di polizia.",
    reference: "Art. 5(1)(d) EU AI Act",
  },
  {
    letter: "e",
    title: "Scraping non mirato di immagini facciali",
    summary: "Creazione o espansione di database di riconoscimento facciale tramite scraping indiscriminato da internet o CCTV.",
    description:
      "Vietato immettere sul mercato o usare sistemi AI che creano o ampliano database di riconoscimento facciale tramite scraping non mirato di immagini facciali da internet o da footage di videosorveglianza, indipendentemente dalla finalità dichiarata.",
    example:
      "Un motore di ricerca visuale che indicizza miliardi di volti da foto pubbliche per identificare persone in tempo reale; un sistema di surveillance che aggrega feed CCTV per costruire un database biometrico di massa.",
    who_is_at_risk: "Provider di sistemi di identificazione biometrica, piattaforme di sicurezza urbana.",
    reference: "Art. 5(1)(e) EU AI Act",
  },
  {
    letter: "f",
    title: "Riconoscimento delle emozioni in ambito lavorativo e scolastico",
    summary: "Sistemi che inferiscono lo stato emotivo di persone in luoghi di lavoro o istituti educativi.",
    description:
      "Vietato immettere sul mercato o usare AI per inferire le emozioni di persone fisiche in contesti lavorativi o scolastici. Eccezione: uso per motivi medici documentati o di sicurezza sul lavoro (es. rilevazione stati di fatica in operatori di macchinari).",
    example:
      "Software per videochiamate che analizza le microespressioni dei dipendenti durante le riunioni per valutarne l'engagement; sistema scolastico che monitora l'attenzione degli studenti tramite webcam.",
    who_is_at_risk: "Provider di piattaforme HR, SaaS per videoconferenze, piattaforme EdTech.",
    reference: "Art. 5(1)(f) EU AI Act",
  },
  {
    letter: "g",
    title: "Categorizzazione biometrica per attributi sensibili",
    summary: "Sistemi che categorizzano individualmente persone fisiche in base a dati biometrici per dedurre attributi protetti.",
    description:
      "Vietato immettere sul mercato o usare sistemi di categorizzazione biometrica che, su base individuale, inferiscono razza, opinioni politiche, appartenenza sindacale, convinzioni religiose o filosofiche, vita sessuale od orientamento sessuale. Eccezione: labelling/filtering di dataset biometrici lecitamente acquisiti nell'ambito delle attività di law enforcement, o categorizzazione biometrica conforme al diritto UE nell'ambito del contrasto.",
    example:
      "Un sistema di analisi video che classifica le persone per etnia o religione presunta per finalità di marketing o sicurezza; app di dating che inferisce l'orientamento sessuale dall'analisi facciale.",
    who_is_at_risk: "Provider di sistemi di computer vision, piattaforme di marketing basato su AI.",
    reference: "Art. 5(1)(g) EU AI Act",
  },
  {
    letter: "h",
    title: "Identificazione biometrica remota in tempo reale in spazi pubblici (law enforcement)",
    summary: "Uso di RBI real-time in spazi pubblicamente accessibili a fini di contrasto, salvo eccezioni tassative.",
    description:
      "Vietato l'uso di sistemi di identificazione biometrica remota (RBI) in tempo reale in spazi pubblicamente accessibili a fini di contrasto, a meno che non sia strettamente necessario per: (i) ricerca di specifici minori scomparsi o vittime di tratta; (ii) prevenzione di minacce specifiche, sostanziali e imminenti alla vita o di attacchi terroristici; (iii) identificazione di persone sospettate di reati gravi. Richiede autorizzazione giudiziaria o amministrativa preventiva e notifica all'autorità di vigilanza.",
    example:
      "Sistema di sorveglianza che scansiona in tempo reale i volti di tutti i passanti in una piazza per confrontarli con database di persone ricercate senza autorizzazione giudiziaria e senza uno dei tre presupposti tassativi.",
    who_is_at_risk: "Forze dell'ordine, provider di sistemi di sorveglianza per PA, gestori di spazi pubblici.",
    reference: "Art. 5(1)(h) EU AI Act",
  },
] as const;

// ─── Singola fattispecie espandibile ──────────────────────────────────────────

function PracticeRow({ p }: { p: typeof PRACTICES[number] }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        borderRadius: 8,
        border: `1px solid ${T.border}`,
        overflow: "hidden",
        background: T.card,
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-black/[0.015]"
      >
        {/* Lettera */}
        <span
          style={{
            ...MONO,
            fontWeight: 700,
            color: T.red,
            background: T.redBg,
            border: `1px solid ${T.redBdr}`,
            borderRadius: 4,
            padding: "1px 6px",
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          {p.letter}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold" style={{ color: T.text }}>
            {p.title}
          </p>
          <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: T.muted }}>
            {p.summary}
          </p>
        </div>

        <span className="flex-shrink-0 mt-0.5" style={{ color: T.faint }}>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 space-y-3"
              style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}
            >
              {/* Descrizione normativa */}
              <p className="text-[11px] leading-relaxed" style={{ color: "rgba(0,0,0,0.55)" }}>
                {p.description}
              </p>

              {/* Esempio */}
              <div
                className="rounded-lg px-3 py-2.5"
                style={{ background: T.rowBg, border: `1px solid ${T.border}` }}
              >
                <p
                  className="text-[10px] font-semibold uppercase mb-1"
                  style={{ ...MONO, color: T.faint }}
                >
                  Esempio concreto
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: T.muted }}>
                  {p.example}
                </p>
              </div>

              {/* Chi è a rischio */}
              <div>
                <p
                  className="text-[10px] font-semibold uppercase mb-1"
                  style={{ ...MONO, color: T.faint }}
                >
                  Chi è a rischio
                </p>
                <p className="text-[11px]" style={{ color: T.muted }}>
                  {p.who_is_at_risk}
                </p>
              </div>

              {/* Riferimento normativo */}
              <p style={{ ...MONO, color: T.faint }}>{p.reference}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Pannello principale ──────────────────────────────────────────────────────

export function ProhibitedPracticesArt5() {
  return (
    <div className="space-y-3 mt-3">
      {/* Banner rischio inaccettabile */}
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3"
        style={{ background: T.redBg, border: `1px solid ${T.redBdr}` }}
      >
        <AlertOctagon size={15} style={{ color: T.red, flexShrink: 0, marginTop: 1 }} />
        <div>
          <p className="text-[12px] font-semibold mb-0.5" style={{ color: T.red }}>
            Rischio inaccettabile — divieto in vigore dal 2 febbraio 2025
          </p>
          <p className="text-[11px] leading-relaxed" style={{ color: "rgba(0,0,0,0.50)" }}>
            Le pratiche elencate di seguito sono <strong>categoricamente vietate</strong> dall&apos;Art. 5 EU AI Act.
            La violazione comporta sanzioni fino a <strong>€35.000.000</strong> o il{" "}
            <strong>7% del fatturato mondiale annuo</strong> (si applica il massimo tra i due).
            Non sono ammesse deroghe salvo le eccezioni tassative indicate nella norma.
          </p>
        </div>
      </div>

      {/* Le 8 fattispecie */}
      <div className="space-y-2">
        {PRACTICES.map((p) => (
          <PracticeRow key={p.letter} p={p} />
        ))}
      </div>

      {/* Nota metodologica */}
      <p
        className="text-[10px] leading-relaxed"
        style={{ ...MONO, color: T.faint }}
      >
        Fonte: Regolamento (UE) 2024/1689 — Art. 5(1)(a–h). Testo applicabile dal 2 febbraio 2025.
        Le eccezioni alle lettere (d), (f), (g), (h) sono tassative e richiedono, ove previsto, autorizzazione dell&apos;autorità competente.
      </p>
    </div>
  );
}
