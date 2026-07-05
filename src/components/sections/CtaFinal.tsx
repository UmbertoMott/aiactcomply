"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";

export default function CtaFinal() {
  return (
    <section
      className="px-12 py-28 text-center"
      style={{ background: "#0D1016" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl mx-auto"
      >
        <h2
          className="text-white mb-5"
          style={{
            fontSize: "clamp(36px, 4vw, 52px)",
            fontWeight: 400,
            letterSpacing: "-2.5px",
            lineHeight: 1.05,
          }}
        >
          Attiva l&rsquo;assistenza.<br />Ogni valutazione validata.
        </h2>
        <p
          className="mb-9 leading-relaxed"
          style={{
            fontSize: "16px",
            fontWeight: 300,
            color: "rgba(255,255,255,0.4)",
          }}
        >
          Chiamata di 30 minuti. Analizziamo insieme il tuo sistema AI e ti mostriamo
          come l&rsquo;avvocato, assistito dallo strumento, predispone il tuo primo assessment.
        </p>
        <div className="flex gap-3 justify-center">
          <Button href="/contatti" variant="primary">
            Attiva l&rsquo;assistenza
          </Button>
          <Button href="/contatti" variant="ghost">Parla con l&rsquo;avvocato</Button>
        </div>
      </motion.div>
    </section>
  );
}
