import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scanner AI Act — Verifica rapida del tuo sistema di IA",
  description: "Verifica in pochi minuti ruolo, livello di rischio e obblighi del tuo sistema di IA secondo il Regolamento (UE) 2024/1689, come modificato dal Reg. (UE) 2026/1744.",
  alternates: { canonical: "/scanner" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
