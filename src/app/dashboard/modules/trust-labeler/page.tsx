"use client";

import { useState } from "react";
import {
  Shield,
  FileImage,
  Download,
  CheckCircle,
  AlertTriangle,
  FileCode,
  Lock,
  Globe,
} from "lucide-react";
import { generateC2PAManifest, verifyC2PAManifest } from "@/lib/crypto/c2pa";

const assets = [
  { name: "hero-banner.webp", type: "image" as const, size: "2.4 MB" },
  { name: "product-demo.mp4", type: "video" as const, size: "14.1 MB" },
  { name: "terms-summary.pdf", type: "text" as const, size: "0.8 MB" },
  { name: "chat-response.txt", type: "text" as const, size: "—" },
];

export default function TrustLabelerPage() {
  const [selectedAsset, setSelectedAsset] = useState<typeof assets[number] | null>(null);
  const [manifest, setManifest] = useState<ReturnType<typeof generateC2PAManifest> | null>(null);
  const [verification, setVerification] = useState<ReturnType<typeof verifyC2PAManifest> | null>(null);

  function handleSelect(asset: typeof assets[number]) {
    setSelectedAsset(asset);
    const m = generateC2PAManifest(asset.name, asset.type);
    setManifest(m);
    setVerification(verifyC2PAManifest(m));
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Trust-Labeler</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Standard C2PA per watermarking crittografico. Certificati X.509 per firma
          metadati. Filigrana interoperabile (Art. 50).
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Asset protetti", value: manifest ? "1" : "0", color: "text-foreground" },
          { label: "Firma C2PA", value: manifest ? "SHA-256 + X.509" : "—", color: "text-primary" },
          { label: "Verifica", value: verification?.valid ? "✅ Valida" : "In attesa", color: verification?.valid ? "text-success" : "text-muted-foreground" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4">
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Asset pipeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Pipeline watermarking</h2>
              {manifest && (
                <button className="rounded-lg border border-border px-2.5 py-1.5 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <Download className="h-3 w-3" /> Export C2PA manifest
                </button>
              )}
            </div>
            <div className="divide-y divide-border/50">
              {assets.map((a) => (
                <div
                  key={a.name}
                  className={`px-5 py-3 hover:bg-muted/30 cursor-pointer ${selectedAsset?.name === a.name ? "bg-muted/50" : ""}`}
                  onClick={() => handleSelect(a)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileImage className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-foreground font-medium">{a.name}</span>
                    </div>
                    <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${selectedAsset?.name === a.name ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {selectedAsset?.name === a.name ? "Marcato C2PA" : "Seleziona"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-6">
                    <span className="text-[10px] text-muted-foreground">{a.type}</span>
                    <span className="text-[10px] text-muted-foreground">{a.size}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verification */}
          {verification && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Verifica crittografica</h2>
              <div className="space-y-2">
                {verification.checks.map((check, i) => (
                  <div key={i} className={`rounded-lg border px-3 py-2 text-xs flex items-center justify-between ${
                    check.passed ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"
                  }`}>
                    <span className={check.passed ? "text-success" : "text-danger"}>{check.name}</span>
                    <span className="text-[10px] text-muted-foreground">{check.detail}</span>
                  </div>
                ))}
              </div>
              {verification.valid && (
                <div className="mt-3 flex items-center gap-2 text-xs text-success">
                  <CheckCircle className="h-4 w-4" />
                  Manifest C2PA valido — watermarking interoperabile
                </div>
              )}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="lg:col-span-1 space-y-4">
          {manifest ? (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Metadati C2PA — {selectedAsset?.name}</h2>
              <div className="space-y-2">
                {[
                  { label: "Assertion", value: `ai.generated.content.${selectedAsset?.type}` },
                  { label: "Algoritmo", value: manifest.alg },
                  { label: "Generatore", value: manifest.assertions[0].data.generator as string },
                  { label: "Timestamp", value: manifest.iat.slice(0, 19).replace("T", " ") },
                  { label: "Certificato", value: `X.509 — ${manifest.credentials[0].issuer}` },
                  { label: "Firma", value: manifest.signature.slice(0, 32) + "..." },
                ].map((m) => (
                  <div key={m.label} className="flex justify-between text-xs py-1 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="text-foreground font-mono text-[10px]">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Metadati C2PA</h2>
              <p className="text-xs text-muted-foreground">Seleziona un asset per generare il manifest C2PA con firma X.509.</p>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Interoperabilità C2PA</h2>
            <div className="space-y-2">
              {[
                { name: "LinkedIn", supported: true },
                { name: "Google Search", supported: true },
                { name: "Meta (Facebook)", supported: true },
                { name: "X / Twitter", supported: false },
                { name: "TikTok", supported: false },
              ].map((p) => (
                <div key={p.name} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground">{p.name}</span>
                  <span className={`text-[10px] ${p.supported ? "text-success" : "text-muted-foreground"}`}>
                    {p.supported ? "Supportato" : "In attesa"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
            <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-xs font-semibold text-foreground">AI-Generated Content</p>
            <p className="text-[10px] text-muted-foreground">Conforme Art. 50(2) — C2PA v2.1</p>
          </div>
        </div>
      </div>
    </div>
  );
}
