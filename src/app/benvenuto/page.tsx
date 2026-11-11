import type { Metadata } from "next";
import { Suspense } from "react";
import WelcomeStatus from "./WelcomeStatus";

export const metadata: Metadata = {
  title: { absolute: "Pagamento ricevuto — RegulaeOS" },
  robots: { index: false, follow: false },
};

export default function BenvenutoPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#fafaf9", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
      <Suspense fallback={null}>
        <WelcomeStatus />
      </Suspense>
    </main>
  );
}
