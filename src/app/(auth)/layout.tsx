"use client";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — dark, matches homepage nav/hero */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: "#0D1016" }}
      >
        <a href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          <img src="/logo.png" alt="RegulaeOS" style={{ height: 26, width: "auto", filter: "invert(1)" }} />
        </a>

        <div>
          <p
            className="text-[11px] font-semibold uppercase mb-6"
            style={{ color: "rgba(255,255,255,0.25)", letterSpacing: "1.5px" }}
          >
            Regolamento UE 2024/1689
          </p>
          <h2
            className="text-white mb-6"
            style={{ fontSize: "36px", fontWeight: 400, letterSpacing: "-1.5px", lineHeight: 1.1 }}
          >
            Compliance AI Act.<br />
            <span style={{ color: "rgba(255,255,255,0.35)" }}>Automatizzata.</span>
          </h2>
          <div className="space-y-3">
            {[
              "Evidence Layer immutabile SHA-256",
              "AIA-Architect — Dossier Vivente Allegato IV",
              "Rights-Simulator — FRIA automatizzato",
              "Guardian-Agent — sorveglianza runtime",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div
                  className="w-1 h-1 rounded-full flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.25)" }}
                />
                <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
          © 2025 RegulaeOS. Tutti i diritti riservati.
        </p>
      </div>

      {/* Right panel — white, clean */}
      <div
        className="flex-1 flex items-center justify-center p-6"
        style={{ background: "#FAFAF9" }}
      >
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <a
            href="/"
            className="lg:hidden text-[18px] font-semibold mb-10 block hover:opacity-70 transition-opacity"
            style={{ color: "#0D1016", letterSpacing: "-0.5px", textDecoration: "none" }}
          >
            <img src="/logo.png" alt="RegulaeOS" style={{ height: 24, width: "auto" }} />
          </a>
          {children}
        </div>
      </div>
    </div>
  );
}
