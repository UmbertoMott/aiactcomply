import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lista d'attesa",
  description: "Iscriviti alla lista d'attesa di RegulaeOS per la conformità all'EU AI Act.",
  alternates: { canonical: "/waitlist" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
