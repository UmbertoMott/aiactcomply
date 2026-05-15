"use client";

import ThemeSwitcher from "@/components/ui/ThemeSwitcher";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-accent to-purple-600 items-center justify-center p-12 relative">
        <div className="absolute top-4 right-4">
          <ThemeSwitcher />
        </div>
        <div className="max-w-md">
          <h1 className="text-4xl font-bold text-white mb-6">AIComply</h1>
          <p className="text-lg text-white/80 leading-relaxed">
            Piattaforma Algorithmic Trust per la conformità al Regolamento UE
            2024/1689 sull&apos;Intelligenza Artificiale.
          </p>
          <div className="mt-12 space-y-4">
            {[
              "Evidence Layer immutabile con hash crittografico",
              "AIA-Architect: Dossier Vivente Allegato IV",
              "Rights-Simulator: FRIA con Red Teaming",
              "Guardian-Agent: sorveglianza runtime",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-white/40" />
                <span className="text-white/70 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex justify-end mb-4 lg:hidden">
            <ThemeSwitcher />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
