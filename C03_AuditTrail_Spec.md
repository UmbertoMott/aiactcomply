# C03 — Immutable AI Output Audit Trail Specification
## Regolamento UE 2024/1689 Art. 12 + Art. 50 + GDPR Art. 5(1)(e)

**Versione:** 1.0  
**Data:** 2026-05-21  
**Database:** Supabase (PostgreSQL 15)  
**Scope:** Ogni output generato o analizzato dall'AI su AIComply

---

## 1. Obiettivo

Garantire un audit trail inalterabile di ogni output AI prodotto dalla piattaforma, conforme a:
- **Art. 12 EU AI Act** — obbligo di registrazione automatica (log keeping)
- **Art. 50 EU AI Act** — trasparenza sugli output AI
- **GDPR Art. 5(1)(e)** — limitazione della conservazione (10 anni per compliance, poi scadenza automatica)
- **ISO 27001** — integrità dei log

---

## 2. Schema tabella `ai_output_log`

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE ai_output_log (
  -- Identity
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  output_id            TEXT NOT NULL UNIQUE,          -- [TIPO]-[YYYYMMDD]-[NNN]
  tenant_id            UUID NOT NULL,                  -- organizzazione

  -- Content (encrypted at rest via pgcrypto)
  input_hash           TEXT NOT NULL,                  -- SHA-256 dell'input
  output_hash          TEXT NOT NULL,                  -- SHA-256 dell'output
  input_text           TEXT,                           -- cifrato pgp_sym_encrypt
  output_text          TEXT,                           -- cifrato pgp_sym_encrypt
  document_type        TEXT NOT NULL,                  -- es. "Documentazione Tecnica Art. 11"
  output_type_code     TEXT NOT NULL,                  -- AIA, RSK, DAT, ...

  -- AI metadata
  model_name           TEXT NOT NULL,
  model_version        TEXT,
  system_version       TEXT NOT NULL,

  -- Actor
  user_id              UUID,
  user_email           TEXT,
  ip_address           INET,
  user_agent           TEXT,

  -- Hash chain (immutability)
  record_hash          TEXT NOT NULL,                  -- SHA-256 di questo record
  previous_record_hash TEXT NOT NULL DEFAULT 'genesis',

  -- Lifecycle
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at           TIMESTAMPTZ GENERATED ALWAYS AS (created_at + INTERVAL '10 years') STORED,

  -- GDPR
  gdpr_redacted        BOOLEAN NOT NULL DEFAULT FALSE,
  gdpr_redacted_at     TIMESTAMPTZ,
  gdpr_redacted_by     TEXT,

  -- Compliance flags
  regulation_refs      TEXT[] DEFAULT ARRAY['EU-AI-Act-2024/1689-Art12', 'EU-AI-Act-2024/1689-Art50'],
  requires_review      BOOLEAN NOT NULL DEFAULT TRUE
);
```

### Indici

```sql
CREATE INDEX idx_audit_tenant      ON ai_output_log(tenant_id);
CREATE INDEX idx_audit_created     ON ai_output_log(created_at DESC);
CREATE INDEX idx_audit_output_type ON ai_output_log(output_type_code);
CREATE INDEX idx_audit_user        ON ai_output_log(user_id);
CREATE INDEX idx_audit_expires     ON ai_output_log(expires_at);
```

### Sequence per output_id NNN (multi-istanza safe)

```sql
-- Una sequence per tenant+tipo+giorno
-- Gestita a livello applicativo con advisory lock oppure via funzione
CREATE SEQUENCE ai_output_id_seq START 1 INCREMENT 1 NO MAXVALUE CYCLE;
```

---

## 3. Livelli di immutabilità

### Livello 1 — Database trigger (obbligatorio)

```sql
CREATE OR REPLACE FUNCTION enforce_audit_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'AUDIT_IMMUTABLE: cancellazione vietata su ai_output_log (record: %). '
      'Per GDPR Art. 17 usa la procedura di redazione.',
      OLD.id;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    -- Permetti SOLO redazione GDPR (campi specifici)
    IF OLD.gdpr_redacted = FALSE AND NEW.gdpr_redacted = TRUE THEN
      -- Redazione legittima: aggiorna solo i campi consentiti
      NEW.id                   := OLD.id;
      NEW.output_id            := OLD.output_id;
      NEW.tenant_id            := OLD.tenant_id;
      NEW.input_hash           := OLD.input_hash;
      NEW.output_hash          := OLD.output_hash;
      NEW.record_hash          := OLD.record_hash;
      NEW.previous_record_hash := OLD.previous_record_hash;
      NEW.created_at           := OLD.created_at;
      NEW.expires_at           := OLD.expires_at;
      NEW.regulation_refs      := OLD.regulation_refs;
      RETURN NEW;
    END IF;
    RAISE EXCEPTION
      'AUDIT_IMMUTABLE: modifica vietata su ai_output_log (record: %). '
      'Questo record è parte di un audit trail inalterabile EU AI Act Art. 12.',
      OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_immutability_guard
  BEFORE UPDATE OR DELETE ON ai_output_log
  FOR EACH ROW EXECUTE FUNCTION enforce_audit_immutability();

-- Revoca UPDATE/DELETE al ruolo applicativo
REVOKE UPDATE, DELETE ON ai_output_log FROM authenticated;
REVOKE UPDATE, DELETE ON ai_output_log FROM anon;
```

### Livello 2 — S3 Object Lock WORM

- Bucket S3 con **Object Lock in COMPLIANCE mode**
- Retention: **10 anni** (3650 giorni)
- Upload: cron orario dei nuovi record (batch JSON)
- Versioning abilitato (non disabilitabile in COMPLIANCE mode)

```
Bucket policy: s3:PutObjectRetention vietato dopo upload
Bucket name:   aicomply-audit-{env}
Key pattern:   audit/{tenant_id}/{YYYY}/{MM}/{DD}/{output_id}.json
```

### Livello 3 — Integrity Verification Job

- Cron settimanale (domenica 03:00 UTC)
- Ricalcola hash chain dall'inizio
- Confronta `record_hash` e `previous_record_hash` di ogni record in ordine cronologico
- In caso di discrepanza: notifica via email + flag `integrity_violation` nella tabella di audit degli audit

---

## 4. Hash chain

### Funzione `compute_record_hash`

```sql
CREATE OR REPLACE FUNCTION compute_record_hash(
  p_output_id      TEXT,
  p_tenant_id      UUID,
  p_input_hash     TEXT,
  p_output_hash    TEXT,
  p_model_name     TEXT,
  p_created_at     TIMESTAMPTZ,
  p_previous_hash  TEXT
) RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN encode(
    digest(
      p_output_id || '|' ||
      p_tenant_id::TEXT || '|' ||
      p_input_hash || '|' ||
      p_output_hash || '|' ||
      p_model_name || '|' ||
      p_created_at::TEXT || '|' ||
      p_previous_hash,
      'sha256'
    ),
    'hex'
  );
END;
$$;
```

### TypeScript equivalente (lato applicativo)

```typescript
async function computeRecordHash(fields: {
  outputId: string;
  tenantId: string;
  inputHash: string;
  outputHash: string;
  modelName: string;
  createdAt: string;
  previousHash: string;
}): Promise<string> {
  const payload = [
    fields.outputId, fields.tenantId, fields.inputHash,
    fields.outputHash, fields.modelName, fields.createdAt,
    fields.previousHash,
  ].join("|");
  return sha256(payload); // da @/lib/crypto/hash
}
```

---

## 5. Formato output_id (singleton condiviso con C-04)

Pattern: `[TIPO]-[YYYYMMDD]-[NNN]`

- Client-side (C-04): contatore in `localStorage` (`aicomply_output_counter_{date}`)
- Server-side (C-03): contatore in PostgreSQL sequence + advisory lock per tenant

La funzione server `generateServerOutputId(type, tenantId)` è il **singleton autoritativo** per tutti gli output persistiti.

---

## 6. GDPR Art. 17 — Diritto all'oblio

Non cancellare il record. Procedura:

1. Sostituisci `input_text` e `output_text` con `[REDACTED - GDPR Art. 17 - {data}]`
2. Setta `gdpr_redacted = TRUE`
3. Registra `gdpr_redacted_at` e `gdpr_redacted_by`
4. **Mantieni** `record_hash`, `previous_record_hash`, `input_hash`, `output_hash`, metadati
5. Il trigger permette questo UPDATE specifico (check `gdpr_redacted: false → true`)

---

## 7. File da creare

```
supabase/migrations/20260521000001_audit_trail.sql
src/lib/audit/
  audit-types.ts          — TypeScript types
  audit-trail.ts          — insertAuditRecord() — server-side
  audit-verify.ts         — verifyHashChain()
  audit-gdpr.ts           — redactForGDPR()
  audit-s3.ts             — backupToS3() — richiede @aws-sdk/client-s3
  output-id-server.ts     — generateServerOutputId() — PostgreSQL-based
src/app/api/audit/
  log/route.ts            — POST
  verify/route.ts         — GET (cron)
  redact/route.ts         — POST (GDPR Art. 17)
  backup/route.ts         — GET (S3 cron)
```

---

## 8. Variabili d'ambiente richieste

```
SUPABASE_SERVICE_ROLE_KEY=   # per bypass RLS su insert audit
AUDIT_ENCRYPTION_KEY=        # chiave per pgcrypto (32+ chars, secret)
AWS_ACCESS_KEY_ID=           # per S3 Object Lock
AWS_SECRET_ACCESS_KEY=       # per S3 Object Lock
AWS_REGION=                  # es. eu-west-1
AUDIT_S3_BUCKET=             # es. aicomply-audit-prod
AUDIT_ALERT_EMAIL=           # destinatario alert integrity
```

---

*Spec approvata — pronta per implementazione*
