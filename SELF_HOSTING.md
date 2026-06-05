# AIComply — Self-Hosting Guide

*Sovereign / Air-gapped deployment — tutti i dati rimangono nella tua infrastruttura*

> **Nota:** Questa guida è pensata per organizzazioni che non possono inviare dati a servizi cloud
> (banche, PA, studi legali, infrastrutture critiche). Richiede competenze DevOps di base.

---

## Architettura self-hosted

```
┌─────────────────────────────────────────────────┐
│                  Rete privata                    │
│                                                  │
│  ┌──────────────┐    ┌──────────────────────┐   │
│  │  Next.js App │────│  PostgreSQL (locale) │   │
│  │  (porta 3000)│    │  + PostgREST API     │   │
│  └──────┬───────┘    └──────────────────────┘   │
│         │                                        │
│  ┌──────▼───────┐    ┌──────────────────────┐   │
│  │  Ollama      │    │  Python RAG Ingestor │   │
│  │  (porta 11434│    │  (script one-shot)   │   │
│  │  LLM locale) │    └──────────────────────┘   │
│  └──────────────┘                                │
└─────────────────────────────────────────────────┘
```

### Cosa viene sostituito

| Componente cloud             | Alternativa self-hosted             | Note                              |
|-----------------------------|-------------------------------------|-----------------------------------|
| Supabase cloud               | PostgreSQL + PostgREST              | Mantiene RLS e Auth               |
| Vertex AI (Gemini 2.0 Flash) | Ollama + `llama3.1:8b` o `mistral:7b` | Leggermente meno accurato         |
| Vertex AI Embeddings         | Ollama + `nomic-embed-text`         | Open-source, qualità eccellente   |
| Vercel                       | Docker + nginx (o VPS qualsiasi)    |                                   |

---

## Prerequisiti

- Docker Desktop (Mac/Windows) o Docker Engine (Linux)
- **16 GB RAM minimo** (per LLM locale 8B parametri)
- **20 GB spazio disco** (modelli LLM + database)
- Per GPU acceleration (opzionale): NVIDIA GPU con CUDA 12+

---

## Setup in 5 passi

### Passo 1 — Clona e configura le variabili d'ambiente

```bash
git clone https://github.com/UmbertoMott/aiactcomply.git
cd aiactcomply
cp .env.self-hosted.example .env.local
```

Modifica `.env.local` con i tuoi valori (vedi sezione variabili sotto).

### Passo 2 — Avvia lo stack completo

```bash
docker compose up -d
```

Questo avvia: PostgreSQL, PostgREST, Ollama, e l'app Next.js.
Il primo avvio scarica i modelli Ollama (~5 GB) — attendere il completamento di `ollama-init`.

```bash
# Monitora il download modelli:
docker compose logs -f ollama-init
```

### Passo 3 — Esegui le migration del database

```bash
# Manualmente via psql:
docker compose exec postgres psql -U postgres -d aicomply \
  -f /migrations/20260604000001_core_schema.sql

# Verifica le tabelle create:
docker compose exec postgres psql -U postgres -d aicomply -c "\dt"
```

### Passo 4 — Indicizza i documenti normativi (RAG)

Copia i PDF normativi nella cartella `rag/documents/`:

```
rag/documents/
├── testo-italiano-AI-act.pdf
├── Draft_Guidelines_on_the_classification_high_risk_AI.pdf
├── ISO_IEC_22989_2022.pdf
└── SCAN-ISO-420012023.pdf
```

Poi avvia l'ingestor:

```bash
docker compose run --rm rag-ingestor
```

### Passo 5 — Verifica il funzionamento

```bash
# App disponibile su:
open http://localhost:3000

# Verifica Ollama (LLM locale):
curl http://localhost:11434/api/tags

# Verifica modelli scaricati:
docker compose exec ollama ollama list

# Verifica PostgreSQL:
docker compose exec postgres psql -U postgres -d aicomply -c "\dt"

# Verifica RAG chunks indicizzati:
docker compose exec postgres psql -U postgres -d aicomply \
  -c "SELECT COUNT(*) FROM rag_chunks;"
```

---

## Variabili d'ambiente

Copia `.env.self-hosted.example` in `.env.local` e compila i valori:

```env
# ─── App ──────────────────────────────────────────────────────
APP_URL=http://localhost:3000

# ─── PostgreSQL ────────────────────────────────────────────────
POSTGRES_PASSWORD=cambia_questa_password_sicura

# ─── PostgREST JWT (genera con: openssl rand -base64 32) ───────
SUPABASE_JWT_SECRET=genera-una-stringa-random-di-almeno-32-caratteri

# ─── Supabase-compatibili (self-hosted via PostgREST) ──────────
NEXT_PUBLIC_SUPABASE_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_ANON_KEY=<jwt-anonimo>
SUPABASE_SERVICE_ROLE_KEY=<jwt-service-role>

# ─── Ollama (LLM locale) ───────────────────────────────────────
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_LLM_MODEL=llama3.1:8b
OLLAMA_EMBED_MODEL=nomic-embed-text

# ─── Feature flags ────────────────────────────────────────────
AICOMPLY_MODE=self-hosted
AICOMPLY_RAG_PROVIDER=ollama

# ─── Vertex AI — lasciare vuoti in self-hosted ─────────────────
VERTEX_PROJECT_ID=
VERTEX_LOCATION=
VERTEX_SERVICE_ACCOUNT_JSON=
```

---

## Modelli Ollama consigliati

| Modello             | RAM richiesta | Qualità   | Uso consigliato                  |
|--------------------|--------------|-----------|----------------------------------|
| `llama3.1:8b`      | 8 GB         | ★★★★☆   | Produzione base                  |
| `llama3.1:70b`     | 48 GB        | ★★★★★   | Produzione enterprise (GPU)      |
| `mistral:7b`       | 6 GB         | ★★★☆☆   | Server con poca RAM              |
| `nomic-embed-text` | 1 GB         | ★★★★★   | Embeddings (sempre questo)       |

---

## Requisiti hardware

| Configurazione  | CPU      | RAM    | Storage    | Note                        |
|----------------|----------|--------|------------|-----------------------------|
| Minima (test)  | 4 core   | 16 GB  | 50 GB SSD  | Solo `mistral:7b`           |
| Raccomandata   | 8 core   | 32 GB  | 100 GB SSD | `llama3.1:8b`               |
| Enterprise     | 16 core + GPU | 64 GB+ | 200 GB NVMe | `llama3.1:70b`          |

---

## Sicurezza per ambienti air-gapped

1. **Rete:** Blocca tutto il traffico uscente. In modalità `self-hosted` l'app non fa chiamate esterne.
2. **Aggiornamenti:** Scarica immagini Docker e modelli Ollama in un ambiente connesso, poi trasferiscili offline.
3. **TLS:** Configura nginx come reverse proxy con certificato TLS interno.
4. **Segreti:** Non committare mai `.env.local`. Usa un secret manager (Vault, AWS Secrets Manager, etc.).

### Backup

```bash
# Backup database
docker compose exec postgres pg_dump -U postgres aicomply > backup_$(date +%Y%m%d).sql

# Restore
docker compose exec -T postgres psql -U postgres aicomply < backup_20260101.sql

# Backup volumi Docker completi
docker run --rm -v aicomply_postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres_volume_$(date +%Y%m%d).tar.gz -C /data .
```

---

## Aggiornamento

```bash
git pull origin main
docker compose build app
docker compose up -d app
# Le migration devono essere applicate manualmente se il DB schema è cambiato
```

---

## Troubleshooting

**Ollama non risponde:**
```bash
docker compose logs ollama
# Se il modello non è ancora scaricato:
docker compose exec ollama ollama pull llama3.1:8b
docker compose exec ollama ollama pull nomic-embed-text
```

**PostgreSQL: tabelle non trovate:**
```bash
docker compose exec postgres psql -U postgres -d aicomply \
  -f /migrations/20260604000001_core_schema.sql
```

**RAG restituisce risposte vuote:**
```bash
# Verifica chunks indicizzati
docker compose exec postgres psql -U postgres -d aicomply \
  -c "SELECT COUNT(*) FROM rag_chunks;"
# Se 0 → ri-esegui l'ingestor
docker compose run --rm rag-ingestor
```

**App non si connette al DB:**
```bash
docker compose logs app | grep -i "error\|supabase\|postgres"
# Verifica che le env vars siano correttamente settate
docker compose exec app env | grep -E "SUPABASE|POSTGRES|OLLAMA"
```

---

## Supporto

Per assistenza sul deploy enterprise: [dridrop@gmail.com](mailto:dridrop@gmail.com)
