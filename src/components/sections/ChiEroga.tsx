"use client";

import { motion } from "framer-motion";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO  = "'DM Mono', monospace";

export default function ChiEroga() {
  return (
    <section
      id="chi-eroga"
      style={{ background: "#fafaf9", borderTop: "1px solid rgba(0,0,0,0.07)", borderBottom: "1px solid rgba(0,0,0,0.07)", padding: "72px 24px" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.55 }}
        style={{ maxWidth: 760, margin: "0 auto" }}
      >
        {/* Eyebrow */}
        <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>
          Chi eroga il servizio
        </p>

        {/* Title */}
        <h2 style={{
          fontFamily: SERIF,
          fontSize: "clamp(24px, 3.5vw, 36px)",
          fontWeight: 400,
          letterSpacing: "-0.5px",
          lineHeight: 1.2,
          color: "#0D1016",
          marginBottom: 20,
        }}>
          Avv. Umberto Mottola — Foro di Napoli
        </h2>

        {/* Body */}
        <p style={{ fontSize: 16, lineHeight: 1.7, color: "rgba(0,0,0,0.62)", marginBottom: 16 }}>
          Il servizio è reso dall&rsquo;<strong>Avv. Umberto Mottola</strong>, iscritto all&rsquo;Ordine degli Avvocati
          di Napoli, nell&rsquo;esercizio della professione forense e nel rispetto del codice deontologico forense.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: "rgba(0,0,0,0.62)", marginBottom: 16 }}>
          <strong>RegulaeOS è il software con cui l&rsquo;assistenza è erogata.</strong>{" "}
          Ogni valutazione di conformità — Triage, Risk Register, FRIA, DPIA, Post-Market — è assistita
          dallo strumento e revisionata e validata dall&rsquo;avvocato prima di essere finalizzata.
          Gli output automatici della piattaforma non costituiscono di per sé parere legale finché non
          sottoposti a tale verifica [verifica contro il testo vigente].
        </p>

        {/* Divider + legal note */}
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", marginTop: 28, paddingTop: 20 }}>
          <p style={{ fontFamily: MONO, fontSize: 11, color: "rgba(0,0,0,0.38)", lineHeight: 1.65 }}>
            Ai sensi dell&rsquo;art. 35 del Codice Deontologico Forense, la comunicazione informativa
            qui resa è veritiera, verificabile e non comparativa.
            La versione definitiva del copy e dei documenti legali va confermata dall&rsquo;avvocato titolare.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
