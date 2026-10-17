import type { ToolDictionaries } from "./types";

// Testi del gruppo "market_ops": namespace → chiave → testo, in IT e EN.
// Precedenza in translate(): questi testi vincono su dictionaries.ts per la stessa lingua.
const dict: ToolDictionaries = {
  it: {
    market_ops_sig: {
      name_label: "Nome e cognome *",
      email_label: "Email professionale *",
      drawn_label: "Firma grafica (opzionale)",
      clear: "Cancella",
      draw_hint: "Firma nell'area sopra (opzionale)",
      disclaimer: "⚠ Questa firma digitale NON ha valore legale equiparabile a una firma qualificata eIDAS. Firmando, il rappresentante autorizzato conferma di aver letto e accettato tutti gli obblighi previsti dall'Art. 22 del Regolamento (UE) 2024/1689 (AI Act). La firma è accompagnata da timestamp e hash di integrità SHA-256 per finalità di audit.",
      hashing: "Calcolo hash…",
      sign_confirm: "Apponi firma e conferma mandato",
      signed_title: "✓ Mandato firmato digitalmente",
      revoke: "Revoca firma",
      signer: "Firmatario:",
      date: "Data:",
      img_alt: "firma",
    },
  },
  en: {
    market_ops_sig: {
      name_label: "Full name *",
      email_label: "Work email *",
      drawn_label: "Drawn signature (optional)",
      clear: "Clear",
      draw_hint: "Sign in the area above (optional)",
      disclaimer: "⚠ This digital signature does NOT have legal value equivalent to an eIDAS qualified signature. By signing, the authorised representative confirms having read and accepted all obligations under Art. 22 of Regulation (EU) 2024/1689 (AI Act). The signature is accompanied by a timestamp and a SHA-256 integrity hash for audit purposes.",
      hashing: "Computing hash…",
      sign_confirm: "Sign and confirm mandate",
      signed_title: "✓ Mandate digitally signed",
      revoke: "Revoke signature",
      signer: "Signatory:",
      date: "Date:",
      img_alt: "signature",
    },
  },
};

export default dict;
