import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AIComply — Compliance AI Act semplificata",
  description:
    "Piattaforma SaaS per la conformità al Regolamento UE 2024/1689 sull'Intelligenza Artificiale. Classificazione del rischio, documentazione tecnica, gestione qualità e molto altro.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light')})()`}
        </Script>
        {children}
      </body>
    </html>
  );
}
