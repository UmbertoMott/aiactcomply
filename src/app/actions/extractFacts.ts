"use server";
// src/app/actions/extractFacts.ts
// Estrae fatti di compliance da un documento caricato usando Vertex AI.
// Salva i risultati in extracted_facts (status: 'suggested').
// SECURITY: API key server-side only. Nessun valore auto-confermato.

import { getDbClient } from "@/lib/db/client";
import { getOrCreateOrganization } from "@/lib/auth/rbac";
import { generateText } from "@/lib/rag/rag-vertex";

// Campi che l'AI può suggerire (field_target → descrizione)
const EXTRACTABLE_FIELDS: Record<string, string> = {
  "classifier.systemName":       "Nome del sistema AI",
  "classifier.systemDescription":"Descrizione del sistema AI",
  "classifier.intendedPurpose":  "Scopo previsto / uso inteso",
  "classifier.sector":           "Settore di applicazione",
  "riskManager.intendedPurpose": "Scopo previsto (Risk Manager)",
  "riskManager.systemDescription":"Descrizione tecnica del sistema",
  "docugen.systemName":          "Nome del sistema (DocuGen)",
  "docugen.provider":            "Nome del fornitore/provider",
  "docugen.version":             "Versione del sistema",
  "docugen.intendedPurpose":     "Scopo previsto (documentazione tecnica)",
  "dataAudit.datasetDescription":"Descrizione dei dataset usati",
  "dataAudit.dataSources":       "Fonti dei dati di addestramento",
};

interface ExtractedFactRaw {
  field_target: string;
  suggested_value: string;
  source_excerpt: string;
  source_location?: string;
  confidence_score: number;
}

export async function extractFacts(
  documentId: string,
  documentText: string,
  toolId?: string
): Promise<{ ok: boolean; factsCount: number; error?: string }> {
  if (!documentText || documentText.trim().length < 50) {
    return { ok: false, factsCount: 0, error: "Testo documento troppo breve per l'estrazione" };
  }

  try {
    const supabase = await getDbClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, factsCount: 0, error: "not_authenticated" };

    const orgId = await getOrCreateOrganization(user.id);
    if (!orgId) return { ok: false, factsCount: 0, error: "org_not_found" };

    // Filtra i campi rilevanti per il toolId specificato
    const relevantFields = toolId
      ? Object.entries(EXTRACTABLE_FIELDS).filter(([k]) => k.startsWith(toolId))
      : Object.entries(EXTRACTABLE_FIELDS);

    const fieldsList = relevantFields
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n");

    const truncatedText = documentText.slice(0, 8000);

    const prompt = `Sei un esperto di compliance EU AI Act. Analizza il documento seguente ed estrai informazioni rilevanti per la conformità normativa.

DOCUMENTO:
${truncatedText}

CAMPI DA ESTRARRE (se presenti nel documento):
${fieldsList}

ISTRUZIONI:
- Estrai solo informazioni ESPLICITAMENTE presenti nel documento (non inferire)
- Per ogni informazione trovata, cita la porzione esatta del testo (source_excerpt, max 200 caratteri)
- Assegna un confidence_score da 0.0 a 1.0 (1.0 = certezza assoluta, 0.5 = probabile)
- Se un campo non è presente, omettilo

Rispondi SOLO con JSON valido, array di oggetti:
[
  {
    "field_target": "nome.campo",
    "suggested_value": "valore estratto",
    "source_excerpt": "testo originale del documento da cui è estratto",
    "source_location": "es. pagina 2, sezione 3 (opzionale)",
    "confidence_score": 0.85
  }
]

Se non trovi nulla di rilevante, rispondi con: []`;

    const raw = await generateText(prompt, { temperature: 0.1, maxOutputTokens: 1500 });

    // Parse JSON — cerca l'array nel testo
    let facts: ExtractedFactRaw[] = [];
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        facts = JSON.parse(jsonMatch[0]) as ExtractedFactRaw[];
      } catch {
        return { ok: false, factsCount: 0, error: "Risposta AI non parsabile" };
      }
    }

    if (facts.length === 0) return { ok: true, factsCount: 0 };

    // Valida e filtra
    const validFacts = facts.filter(f =>
      f.field_target &&
      f.suggested_value?.trim().length > 0 &&
      f.source_excerpt?.trim().length > 0 &&
      EXTRACTABLE_FIELDS[f.field_target]
    );

    if (validFacts.length === 0) return { ok: true, factsCount: 0 };

    // Salva in extracted_facts
    const rows = validFacts.map(f => ({
      organization_id:  orgId,
      document_id:      documentId,
      field_target:     f.field_target,
      suggested_value:  String(f.suggested_value).slice(0, 2000),
      source_excerpt:   String(f.source_excerpt).slice(0, 500),
      source_location:  f.source_location ?? null,
      confidence_score: Math.min(1, Math.max(0, Number(f.confidence_score) || 0.5)),
      status:           "suggested" as const,
    }));

    const { error } = await supabase.from("extracted_facts").insert(rows);
    if (error) return { ok: false, factsCount: 0, error: error.message };

    // Aggiorna status documento a 'done'
    await supabase
      .from("documents")
      .update({ processing_status: "done" })
      .eq("id", documentId);

    return { ok: true, factsCount: validFacts.length };
  } catch (e) {
    return { ok: false, factsCount: 0, error: String(e) };
  }
}

export async function getExtractedFacts(
  documentId?: string,
  toolId?: string
): Promise<{
  id: string;
  field_target: string;
  suggested_value: string;
  source_excerpt: string;
  source_location: string | null;
  confidence_score: number;
  status: "suggested" | "confirmed" | "edited" | "rejected";
  edited_value: string | null;
  document_id: string;
  created_at: string;
}[]> {
  try {
    const supabase = await getDbClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const orgId = await getOrCreateOrganization(user.id);
    if (!orgId) return [];

    let query = supabase
      .from("extracted_facts")
      .select("id, field_target, suggested_value, source_excerpt, source_location, confidence_score, status, edited_value, document_id, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (documentId) query = query.eq("document_id", documentId);
    if (toolId) query = query.like("field_target", `${toolId}.%`);

    const { data, error } = await query;
    if (error || !data) return [];
    return data as ReturnType<typeof getExtractedFacts> extends Promise<infer R> ? R : never;
  } catch {
    return [];
  }
}

export async function confirmFact(
  factId: string,
  editedValue?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await getDbClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "not_authenticated" };

    const update: Record<string, unknown> = {
      status: editedValue ? "edited" : "confirmed",
      confirmed_by: user.id,
      confirmed_at: new Date().toISOString(),
    };
    if (editedValue !== undefined) update.edited_value = editedValue;

    const { error } = await supabase
      .from("extracted_facts")
      .update(update)
      .eq("id", factId);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function rejectFact(
  factId: string,
  reason?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await getDbClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "not_authenticated" };

    const { error } = await supabase
      .from("extracted_facts")
      .update({ status: "rejected", rejection_reason: reason ?? null })
      .eq("id", factId);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
