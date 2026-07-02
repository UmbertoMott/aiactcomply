// src/app/api/documents/upload/route.ts
// Endpoint per upload documenti compliance (PDF, TXT, MD, DOCX)
// Salva su Supabase Storage + crea record in `documents` + avvia estrazione fatti

import { NextRequest, NextResponse } from "next/server";
import { getDbClient } from "@/lib/db/client";
import { getOrCreateOrganization } from "@/lib/auth/rbac";
import { createHash } from "crypto";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(req: NextRequest) {
  try {
    const supabase = await getDbClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const orgId = await getOrCreateOrganization(user.id);
    if (!orgId) {
      return NextResponse.json({ error: "Organizzazione non trovata" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const toolId = formData.get("toolId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Nessun file allegato" }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File troppo grande (max 10 MB)" }, { status: 400 });
    }

    const mimeType = file.type || "application/octet-stream";
    if (!ALLOWED_TYPES.includes(mimeType) && !file.name.match(/\.(pdf|txt|md|docx)$/i)) {
      return NextResponse.json(
        { error: "Tipo file non supportato. Usa PDF, TXT, MD o DOCX." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sourceHash = createHash("sha256").update(buffer).digest("hex");

    // Deduplicazione: se lo stesso file è già stato caricato, ritorna l'id esistente
    const { data: existing } = await supabase
      .from("documents")
      .select("id, processing_status")
      .eq("organization_id", orgId)
      .eq("source_hash", sourceHash)
      .single();

    if (existing) {
      return NextResponse.json({
        documentId: existing.id,
        duplicate: true,
        processingStatus: existing.processing_status,
      });
    }

    // Salva su Supabase Storage
    const storagePath = `${orgId}/${sourceHash.slice(0, 8)}_${file.name}`;
    const { error: storageError } = await supabase.storage
      .from("compliance-docs")
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (storageError && !storageError.message.includes("already exists")) {
      return NextResponse.json(
        { error: `Errore storage: ${storageError.message}` },
        { status: 500 }
      );
    }

    // Crea record in documents
    const { data: docRecord, error: dbError } = await supabase
      .from("documents")
      .insert({
        organization_id:    orgId,
        user_id:            user.id,
        filename:           file.name,
        storage_path:       storagePath,
        mime_type:          mimeType,
        size_bytes:         file.size,
        uploaded_by:        user.id,
        processing_status:  "processing",
        source_hash:        sourceHash,
        metadata:           { toolId: toolId ?? null },
      })
      .select("id")
      .single();

    if (dbError || !docRecord) {
      return NextResponse.json({ error: "Errore creazione record documento" }, { status: 500 });
    }

    // Estrai testo e avvia estrazione fatti in background
    // (fire-and-forget — non blocca la risposta)
    extractAndSaveFacts(buffer, mimeType, docRecord.id, toolId ?? undefined).catch(() => {
      // aggiorna status a failed se l'estrazione fallisce
      supabase
        .from("documents")
        .update({ processing_status: "failed" })
        .eq("id", docRecord.id)
        .then(() => {});
    });

    return NextResponse.json({
      documentId: docRecord.id,
      duplicate: false,
      processingStatus: "processing",
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

async function extractAndSaveFacts(
  buffer: Buffer,
  mimeType: string,
  documentId: string,
  toolId?: string
) {
  const { extractFacts } = await import("@/app/actions/extractFacts");
  const text = await extractTextFromBuffer(buffer, mimeType);
  if (text.trim().length > 50) {
    await extractFacts(documentId, text, toolId);
  }
}

async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
      const data = await pdfParse(buffer);
      return data.text;
    } catch {
      return "";
    }
  }
  // TXT, MD, DOCX (basic): leggi come UTF-8
  return buffer.toString("utf-8").slice(0, 50000);
}
