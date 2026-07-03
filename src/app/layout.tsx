import type { Metadata } from "next";
import { Inter, DM_Sans, DM_Mono } from "next/font/google";
import Script from "next/script";
import CookieBanner from "@/components/CookieBanner";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600"],
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-mono",
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "RegulaeOS — EU AI Act Compliance",
    template: "%s — RegulaeOS",
  },
  description:
    "Piattaforma SaaS per la conformità al Regolamento UE 2024/1689 sull'Intelligenza Artificiale. Classificazione del rischio, FRIA, DPIA, Trust Center e molto altro.",
  metadataBase: new URL("https://www.regulaeos.com"),
  openGraph: {
    title: "RegulaeOS — EU AI Act Compliance",
    description:
      "Sei moduli integrati per coprire l'intero ciclo di vita della conformità AI Act — dalla classificazione del rischio alla pagina di trasparenza pubblica.",
    url: "https://www.regulaeos.com",
    siteName: "RegulaeOS",
    locale: "it_IT",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 1456,
        height: 720,
        alt: "RegulaeOS — EU AI Act Compliance",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RegulaeOS — EU AI Act Compliance",
    description:
      "Piattaforma SaaS per la conformità al Regolamento UE 2024/1689 sull'Intelligenza Artificiale.",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${inter.variable} ${dmSans.variable} ${dmMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light')})()`}
        </Script>
        {children}
        <GoogleAnalytics />
        <CookieBanner />
      </body>
    </html>
  );
}
