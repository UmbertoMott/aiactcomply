"use client";

// Digital signature pad — PROMPT BG
// Light-theme, inline styles to match authorized-rep page

import React, { useRef, useState } from "react";
import type { DigitalSignature } from "@/types/authorized-rep";

const DK = {
  text: "#0D1016",
  muted: "rgba(0,0,0,0.40)",
  faint: "rgba(0,0,0,0.30)",
  border: "rgba(0,0,0,0.10)",
  card: "#ffffff",
  card2: "#f3f4f6",
  green: "#15803d",
  greenBg: "rgba(22,163,74,0.06)",
  greenBdr: "rgba(22,163,74,0.15)",
  red: "#991b1b",
  redBg: "rgba(239,68,68,0.06)",
  redBdr: "rgba(239,68,68,0.18)",
  amber: "#92400e",
  amberBg: "rgba(251,146,60,0.08)",
  amberBdr: "rgba(251,146,60,0.25)",
} as const;

const inp = {
  width: "100%", padding: "7px 10px", borderRadius: 8,
  border: `1px solid ${DK.border}`, fontSize: 12,
  color: DK.text, background: DK.card2, outline: "none",
} as const;

interface Props {
  mandateId: string;
  onSign: (sig: DigitalSignature) => void;
  disabled?: boolean;
}

export function DigitalSignaturePad({ mandateId, onSign, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signerEmail, setSignerEmail] = useState("");
  const [signerName, setSignerName] = useState("");
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signing, setSigning] = useState(false);

  function getCtx() {
    return canvasRef.current?.getContext("2d") ?? null;
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const ctx = getCtx();
    if (!ctx) return;
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing || disabled) return;
    const ctx = getCtx();
    if (!ctx) return;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.strokeStyle = "#0D1016";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    setHasDrawn(true);
  }

  function clearCanvas() {
    const ctx = getCtx();
    const c = canvasRef.current;
    if (!ctx || !c) return;
    ctx.clearRect(0, 0, c.width, c.height);
    setHasDrawn(false);
  }

  async function handleConfirm() {
    if (!signerEmail || !signerName || signing) return;
    setSigning(true);
    try {
      const canvasDataUrl = canvasRef.current?.toDataURL("image/png");
      const signedAt = new Date().toISOString();
      const payload = `${signerEmail}${signedAt}${mandateId}`;
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
      const integrityHash = Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
      onSign({ signedAt, signerEmail, signerName, canvasDataUrl, integrityHash });
    } finally {
      setSigning(false);
    }
  }

  const canSign = !disabled && signerName.trim() && signerEmail.includes("@");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, color: DK.muted, marginBottom: 5 }}>
            Nome e cognome *
          </label>
          <input
            type="text"
            value={signerName}
            onChange={e => setSignerName(e.target.value)}
            placeholder="Mario Rossi"
            disabled={disabled}
            style={inp}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, color: DK.muted, marginBottom: 5 }}>
            Email professionale *
          </label>
          <input
            type="email"
            value={signerEmail}
            onChange={e => setSignerEmail(e.target.value)}
            placeholder="m.rossi@company.eu"
            disabled={disabled}
            style={inp}
          />
        </div>
      </div>

      {/* Signature canvas */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: DK.muted }}>Firma grafica (opzionale)</label>
          <button
            onClick={clearCanvas}
            type="button"
            style={{ fontSize: 11, color: DK.faint, background: "none", border: "none", cursor: "pointer" }}>
            Cancella
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={560}
          height={100}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={() => setIsDrawing(false)}
          onMouseLeave={() => setIsDrawing(false)}
          style={{
            width: "100%", height: 100, borderRadius: 8, display: "block",
            border: `1px solid ${DK.border}`, background: DK.card2,
            cursor: disabled ? "not-allowed" : "crosshair",
          }}
        />
        {!hasDrawn && (
          <p style={{ fontSize: 10, color: DK.faint, textAlign: "center", marginTop: 4 }}>
            Firma nell&apos;area sopra (opzionale)
          </p>
        )}
      </div>

      {/* Legal disclaimer */}
      <p style={{ fontSize: 10, color: DK.faint, lineHeight: 1.5, margin: 0 }}>
        ⚠ Questa firma digitale NON ha valore legale equiparabile a una firma qualificata eIDAS.
        Firmando, il Rappresentante Autorizzato conferma di aver letto e accettato tutti gli obblighi
        previsti dall&apos;Art. 22 EU AI Act. La firma è accompagnata da timestamp e hash di integrità
        SHA-256 per finalità di audit. [verify against current AI Act text]
      </p>

      <button
        onClick={handleConfirm}
        disabled={!canSign || signing}
        style={{
          width: "100%", padding: "9px", borderRadius: 8, fontSize: 12,
          fontWeight: 600, cursor: canSign ? "pointer" : "not-allowed",
          background: canSign ? "#0D1016" : "rgba(0,0,0,0.05)",
          color: canSign ? "#fff" : DK.faint,
          border: `1px solid ${canSign ? "#0D1016" : DK.border}`,
          transition: "all 0.12s",
        }}>
        {signing ? "Calcolo hash…" : "Apponi firma e conferma mandato"}
      </button>
    </div>
  );
}

interface ConfirmationProps {
  signature: DigitalSignature;
  onRevoke?: () => void;
}

export function SignatureConfirmation({ signature, onRevoke }: ConfirmationProps) {
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${DK.greenBdr}`, background: DK.greenBg, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: DK.green, margin: 0 }}>
          ✓ Mandato firmato digitalmente
        </p>
        {onRevoke && (
          <button
            onClick={onRevoke}
            style={{ fontSize: 10, color: DK.red, background: "none", border: "none", cursor: "pointer" }}>
            Revoca firma
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <p style={{ fontSize: 11, color: DK.muted, margin: 0 }}>
          Firmatario: <strong style={{ color: DK.text }}>{signature.signerName}</strong> — {signature.signerEmail}
        </p>
        <p style={{ fontSize: 11, color: DK.muted, margin: 0 }}>
          Data: {new Date(signature.signedAt).toLocaleString("it-IT")}
        </p>
        <p style={{ fontSize: 9, color: DK.faint, fontFamily: "monospace", margin: "4px 0 0",
          wordBreak: "break-all" }}>
          Hash: {signature.integrityHash}
        </p>
      </div>
      {signature.canvasDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={signature.canvasDataUrl} alt="firma" style={{ maxHeight: 60, marginTop: 8, borderRadius: 4,
          border: `1px solid ${DK.border}`, background: "#fff" }} />
      )}
    </div>
  );
}
