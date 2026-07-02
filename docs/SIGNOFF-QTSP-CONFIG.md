# Sign-off & QTSP Configuration

## Livello base (default)

Il sistema usa `NoopTrustService` che non chiama provider esterni.
Ogni firma ha livello `ses` (Simple Electronic Signature) conforme eIDAS.
Il registro ha hash-chain SHA-256 e conservazione 10 anni (Art. 18 AI Act).

## Innesto QTSP (upgrade futura)

Per attivare marca temporale qualificata RFC 3161 o firma AdES-QES:

1. **Crea un file** `src/lib/signoff/providers/my-provider.ts` che implementa
   l'interfaccia `TrustService` da `@/lib/signoff/trust-service.ts`.

2. **Modifica** `getTrustService()` in `trust-service.ts`:
   ```typescript
   export function getTrustService(): TrustService {
     const provider = process.env.NEXT_PUBLIC_TRUST_SERVICE_PROVIDER;
     if (provider === "namirial") {
       return require("./providers/namirial").NamirialTrustService;
     }
     return NoopTrustService;
   }
   ```

3. **Imposta** la variabile d'ambiente:
   ```
   NEXT_PUBLIC_TRUST_SERVICE_PROVIDER=namirial
   NAMIRIAL_API_KEY=...
   NAMIRIAL_TSA_URL=https://...
   ```

## Provider QTSP consigliati (EU, eIDAS)

| Provider     | Tipo      | Note                              |
|-------------|-----------|-----------------------------------|
| Namirial     | TSA + QES | EU, accreditato AgID               |
| Aruba PEC    | TSA       | EU, italiano                       |
| DocuSign eID | QES       | EU, via eID Gateway                |
| InfoCert     | TSA + QES | EU, accreditato AgID               |

## Priorità QTSP

Per i tool a priorità alta (Art. 47 + Allegato V, Art. 22), il pannello SignOffPanel
mostra un badge "QTSP raccomandato" se `qtspRecommended: true` nella config.

Una volta configurato un provider QTSP:
- `qualifiedTimestamp()` restituisce `{ token, tsa, at }` → salvato nel record
- `sign()` per AdES/QES restituisce `{ envelopeId, provider }` → salvato nel record
- I record mostrano badge `AdES` o `QES` invece di `SES`

## Nessuna modifica ai componenti richiesta

Il cambio provider è configurazione pura: zero modifiche a SignOffPanel,
SignOffRegisterView, IntegrityRegisterView, register.ts.
