"use client";
// Classificazione guidata di un sistema: Ruolo → Rischio → Obblighi.
// Tutta la logica giuridica sta in lib/obligations/engine.ts; qui solo domande e resa.
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import ObligationsSummary from "@/components/obligations/ObligationsSummary";
import { loadInventory, updateSystem, type AISystem } from "@/lib/inventory/ai-system";
import {
  determineRoles, assessRisk, computeObligations, legacyRole, legacyTier, isHighRisk,
  ART5_PRACTICES, ANNEX_I_ACTS, ANNEX_III_USES, ART63_CONDITIONS, ROLE_LABEL, RISK_LABEL,
  type RoleAnswers, type RiskAnswers, type Art5Letter, type Art63Condition,
} from "@/lib/obligations/engine";

const T = {
  text: "#0D1016", muted: "rgba(0,0,0,0.45)", faint: "rgba(0,0,0,0.25)",
  border: "rgba(0,0,0,0.08)", card: "#ffffff", bg: "#FAFAF9",
  red: "#dc2626", amber: "#b45309", green: "#15803d",
} as const;

const card: React.CSSProperties = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "20px 22px", marginBottom: 12 };

type Step = 0 | 1 | 2;
const STEPS = ["Il tuo ruolo", "Il livello di rischio", "I tuoi obblighi"];

// ─── Componenti di domanda ────────────────────────────────────────────────────

function Question({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={card}>
      <p style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: "0 0 4px" }}>{title}</p>
      {hint && <p style={{ fontSize: 12, color: T.muted, margin: "0 0 12px", lineHeight: 1.5 }}>{hint}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: hint ? 0 : 10 }}>{children}</div>
    </div>
  );
}

function Choice({ label, sub, selected, onClick, multi }: { label: string; sub?: string; selected: boolean; onClick: () => void; multi?: boolean }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: "flex", gap: 10, alignItems: "flex-start", textAlign: "left", width: "100%",
      padding: "10px 12px", borderRadius: 9, cursor: "pointer",
      border: `1px solid ${selected ? T.text : T.border}`, background: selected ? "rgba(0,0,0,0.035)" : "white",
    }}>
      <span style={{
        width: 16, height: 16, marginTop: 1, flexShrink: 0, borderRadius: multi ? 4 : 999,
        border: `1.5px solid ${selected ? T.text : "rgba(0,0,0,0.25)"}`, background: selected ? T.text : "white",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{selected && <Check size={11} color="white" strokeWidth={3} />}</span>
      <span>
        <span style={{ fontSize: 13, color: T.text, display: "block", lineHeight: 1.45 }}>{label}</span>
        {sub && <span style={{ fontSize: 11.5, color: T.muted, display: "block", marginTop: 2, lineHeight: 1.45 }}>{sub}</span>}
      </span>
    </button>
  );
}

function YesNo({ value, onChange }: { value: boolean | undefined; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {[{ v: true, l: "Sì" }, { v: false, l: "No" }].map(o => (
        <div key={o.l} style={{ flex: 1 }}><Choice label={o.l} selected={value === o.v} onClick={() => onChange(o.v)} /></div>
      ))}
    </div>
  );
}

function toggle<V>(list: V[] | undefined, v: V): V[] {
  const l = list ?? [];
  return l.includes(v) ? l.filter(x => x !== v) : [...l, v];
}

function ResultBox({ title, color, lines }: { title: string; color: string; lines: string[] }) {
  return (
    <div style={{ ...card, borderColor: color, background: "white" }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: T.muted, margin: "0 0 4px" }}>ESITO PROVVISORIO</p>
      <p style={{ fontSize: 16, fontWeight: 700, color, margin: "0 0 8px" }}>{title}</p>
      {lines.map((l, i) => <p key={i} style={{ fontSize: 12.5, color: T.text, margin: "0 0 4px", lineHeight: 1.5 }}>{l}</p>)}
    </div>
  );
}

// ─── Pagina ───────────────────────────────────────────────────────────────────

export default function ClassifyPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [system, setSystem] = useState<AISystem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState<Step>(0);
  const [ra, setRa] = useState<RoleAnswers>({});
  const [rk, setRk] = useState<RiskAnswers>({});

  useEffect(() => {
    const s = loadInventory().find(x => x.id === id);
    if (!s) { setNotFound(true); return; }
    setSystem(s);
    setRa(s.roleAnswers ?? {});
    setRk(s.riskAnswers ?? {});
  }, [id]);

  const roleResult = useMemo(() => determineRoles(ra), [ra]);
  const risk = useMemo(() => assessRisk(rk), [rk]);
  const result = useMemo(() => computeObligations(ra, roleResult, risk, rk), [ra, roleResult, risk, rk]);

  const setR = (p: Partial<RoleAnswers>) => setRa(prev => ({ ...prev, ...p }));
  const setK = (p: Partial<RiskAnswers>) => setRk(prev => ({ ...prev, ...p }));

  function persist() {
    if (!system) return;
    const roles = result.roles;
    updateSystem(system.id, {
      roleAnswers: ra, riskAnswers: rk, roles, assessedAt: new Date().toISOString(),
      role: legacyRole(roles), tier: legacyTier(risk),
      roleBasis: roleResult.basis.join(" "), tierBasis: `${RISK_LABEL[risk.category]}. ${risk.rationale.join(" ")}`,
      dualRoleFlag: roles.length > 1, obligationsAssessed: true,
    });
  }

  if (notFound) return (
    <div style={{ padding: 48 }}>
      <p style={{ color: T.muted, fontSize: 14 }}>Sistema non trovato. <Link href="/dashboard/tools/inventory" style={{ color: T.text, fontWeight: 600 }}>Torna all&apos;inventario</Link></p>
    </div>
  );
  if (!system) return null;

  const thirdParty = ra.developer === "third_party";
  const ownDev = ra.developer === "us" || ra.developer === "commissioned";
  const showOutsideEU = ownDev || (ra.art25?.length ?? 0) > 0 || rk.gpaiModelProvider === true;
  const roleReady = roleResult.complete;
  const riskReady = rk.aiDefinition !== undefined || (rk.scopeExclusions?.length ?? 0) > 0;
  const hr = isHighRisk(risk.category);
  const categoryColor = risk.category === "prohibited" ? T.red : hr ? T.amber : T.green;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", padding: "24px 28px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <Link href={`/dashboard/tools/inventory/${system.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: T.muted, textDecoration: "none", marginBottom: 16 }}>
          <ArrowLeft size={13} /> {system.name}
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 4px", letterSpacing: "-0.4px" }}>Classifica il sistema</h1>
        <p style={{ fontSize: 13, color: T.muted, margin: "0 0 18px", lineHeight: 1.5 }}>
          Rispondi a domande sui fatti: ruolo e rischio li ricava la piattaforma dal Regolamento (UE) 2024/1689. Alla fine trovi solo gli obblighi che riguardano questo sistema.
        </p>

        {/* Stepper */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {STEPS.map((label, i) => {
            const enabled = i === 0 || (i === 1 && roleReady) || (i === 2 && roleReady && riskReady);
            return (
              <button key={label} type="button" disabled={!enabled} onClick={() => { persist(); setStep(i as Step); }} style={{
                flex: 1, textAlign: "left", padding: "10px 12px", borderRadius: 9, cursor: enabled ? "pointer" : "default",
                border: `1px solid ${step === i ? T.text : T.border}`, background: step === i ? T.text : "white",
                color: step === i ? "white" : enabled ? T.text : T.faint,
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", opacity: 0.7 }}>PASSO {i + 1}</span>
                <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>{label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Passo 1: ruolo ── */}
        {step === 0 && (
          <>
            <Question title="Chi ha sviluppato questo sistema?" hint="Conta chi lo ha realizzato o lo ha fatto realizzare, non chi lo usa (Art. 3(3)).">
              <Choice label="Noi" selected={ra.developer === "us"} onClick={() => setR({ developer: "us", thirdPartyUse: undefined, art25: undefined })} />
              <Choice label="Un'altra azienda, su nostra commissione" sub="Es. un'agenzia che ha costruito il sistema per noi." selected={ra.developer === "commissioned"} onClick={() => setR({ developer: "commissioned", thirdPartyUse: undefined, art25: undefined })} />
              <Choice label="Un'altra azienda, che lo offre sul mercato" sub="Es. ChatGPT, un software HR acquistato, un servizio in abbonamento." selected={thirdParty} onClick={() => setR({ developer: "third_party", ownUse: undefined })} />
            </Question>

            {ownDev && (
              <Question title="Come lo usate o lo distribuite?" hint="Puoi scegliere più risposte.">
                <Choice multi label="Lo usiamo noi, all'interno, con il nostro nome" sub="Messa in servizio per uso proprio (Art. 3(11))." selected={!!ra.ownUse?.includes("internal_use")} onClick={() => setR({ ownUse: toggle(ra.ownUse, "internal_use") })} />
                <Choice multi label="Lo offriamo o vendiamo ad altri con il nostro nome o marchio" sub="Immissione sul mercato (Art. 3(9))." selected={!!ra.ownUse?.includes("market")} onClick={() => setR({ ownUse: toggle(ra.ownUse, "market") })} />
                <Choice multi label="È ancora in sviluppo o in prova, non ancora usato né offerto" sub="Art. 2(8): il regolamento si applica dalla messa in servizio o immissione sul mercato." selected={!!ra.ownUse?.includes("development_only")} onClick={() => setR({ ownUse: toggle(ra.ownUse, "development_only") })} />
              </Question>
            )}

            {thirdParty && (
              <>
                <Question title="Cosa fate con questo sistema?" hint="Puoi scegliere più risposte.">
                  <Choice multi label="Lo usiamo per la nostra attività" sub="Art. 3(4)." selected={!!ra.thirdPartyUse?.includes("use")} onClick={() => setR({ thirdPartyUse: toggle(ra.thirdPartyUse, "use") })} />
                  <Choice multi label="Lo portiamo per primi sul mercato UE: il fornitore è fuori UE e il sistema porta il suo marchio" sub="Art. 3(6)." selected={!!ra.thirdPartyUse?.includes("import")} onClick={() => setR({ thirdPartyUse: toggle(ra.thirdPartyUse, "import") })} />
                  <Choice multi label="Lo rivendiamo o lo distribuiamo così com'è" sub="Art. 3(7)." selected={!!ra.thirdPartyUse?.includes("distribute")} onClick={() => setR({ thirdPartyUse: toggle(ra.thirdPartyUse, "distribute") })} />
                </Question>
                <Question title="Avete fatto una di queste cose sul sistema?" hint="Se il sistema è ad alto rischio, ognuna vi rende fornitori (Art. 25(1)). Se nessuna, non selezionare nulla.">
                  <Choice multi label="Ci abbiamo messo il nostro nome o marchio" selected={!!ra.art25?.includes("own_brand")} onClick={() => setR({ art25: toggle(ra.art25, "own_brand") })} />
                  <Choice multi label="L'abbiamo modificato in modo sostanziale" sub="Una modifica non prevista dal fornitore che incide sulla conformità o sulla finalità (Art. 3(23))." selected={!!ra.art25?.includes("substantial_modification")} onClick={() => setR({ art25: toggle(ra.art25, "substantial_modification") })} />
                  <Choice multi label="Lo usiamo per uno scopo diverso da quello previsto dal fornitore" selected={!!ra.art25?.includes("purpose_change")} onClick={() => setR({ art25: toggle(ra.art25, "purpose_change") })} />
                </Question>
              </>
            )}

            {ra.developer && (
              <Question title="La vostra organizzazione è…" hint="Serve per FRIA e registrazione (Artt. 26(8), 27, 49(3)).">
                <Choice label="Un'autorità o un ente pubblico" selected={ra.publicStatus === "public_authority"} onClick={() => setR({ publicStatus: "public_authority" })} />
                <Choice label="Un privato che fornisce servizi pubblici" sub="Es. sanità, istruzione, servizi sociali, alloggi." selected={ra.publicStatus === "public_service"} onClick={() => setR({ publicStatus: "public_service" })} />
                <Choice label="Nessuna delle due" selected={ra.publicStatus === "none"} onClick={() => setR({ publicStatus: "none" })} />
              </Question>
            )}

            {ra.developer && showOutsideEU && (
              <Question title="La vostra organizzazione ha sede fuori dall'Unione europea?" hint="Se sì, serve un rappresentante autorizzato nell'UE (Artt. 22, 54).">
                <YesNo value={ra.establishedOutsideEU} onChange={v => setR({ establishedOutsideEU: v })} />
              </Question>
            )}

            {roleReady && (
              <ResultBox title={roleResult.roles.length ? roleResult.roles.map(r => ROLE_LABEL[r]).join(" + ") : "Nessun ruolo operativo per ora"} color={T.text}
                lines={[...roleResult.basis, ...(roleResult.art25Pending.length ? ["Le modifiche dichiarate (Art. 25(1)) contano se il sistema risulta ad alto rischio: lo vediamo al passo 2."] : [])]} />
            )}
          </>
        )}

        {/* ── Passo 2: rischio ── */}
        {step === 1 && (
          <>
            <Question title="Il sistema rientra in una di queste esclusioni?" hint="Se nessuna, non selezionare nulla (Art. 2).">
              <Choice multi label="Usato solo per scopi militari, di difesa o di sicurezza nazionale" sub="Art. 2(3)." selected={!!rk.scopeExclusions?.includes("military")} onClick={() => setK({ scopeExclusions: toggle(rk.scopeExclusions, "military") })} />
              <Choice multi label="Sviluppato e usato solo per ricerca scientifica" sub="Art. 2(6)." selected={!!rk.scopeExclusions?.includes("scientific_research")} onClick={() => setK({ scopeExclusions: toggle(rk.scopeExclusions, "scientific_research") })} />
            </Question>

            {(rk.scopeExclusions?.length ?? 0) === 0 && (
              <>
                <Question title="Come funziona il sistema?" hint="Serve a capire se è un sistema di IA ai sensi dell'Art. 3(1).">
                  <Choice label="Impara dai dati o fa deduzioni per generare previsioni, contenuti, raccomandazioni o decisioni" sub="Es. machine learning, modelli linguistici, sistemi basati sulla conoscenza." selected={rk.aiDefinition === "infers"} onClick={() => setK({ aiDefinition: "infers" })} />
                  <Choice label="Segue solo regole fisse, scritte interamente da persone" sub="Es. un foglio di calcolo con formule, un flusso if/then. Considerando 12." selected={rk.aiDefinition === "rules_only"} onClick={() => setK({ aiDefinition: "rules_only" })} />
                  <Choice label="Non lo so" sub="Lo trattiamo come IA, per prudenza." selected={rk.aiDefinition === "unsure"} onClick={() => setK({ aiDefinition: "unsure" })} />
                </Question>

                {rk.aiDefinition && rk.aiDefinition !== "rules_only" && (
                  <>
                    <Question title="Il sistema fa una di queste cose?" hint="Pratiche vietate dall'Art. 5. Se nessuna, non selezionare nulla.">
                      {ART5_PRACTICES.map(p => (
                        <div key={p.letter}>
                          <Choice multi label={p.question} sub={p.ref} selected={!!rk.art5?.includes(p.letter)} onClick={() => setK({ art5: toggle(rk.art5, p.letter as Art5Letter) })} />
                          {p.exception && rk.art5?.includes(p.letter) && (
                            <div style={{ margin: "6px 0 4px 26px" }}>
                              <Choice multi label={`Ricorre questo caso: ${p.exception}`} selected={!!rk.art5Exceptions?.includes(p.letter)} onClick={() => setK({ art5Exceptions: toggle(rk.art5Exceptions, p.letter as Art5Letter) })} />
                            </div>
                          )}
                        </div>
                      ))}
                    </Question>

                    <Question title="È un componente di sicurezza di uno di questi prodotti, o è esso stesso il prodotto?" hint="Normativa dell'Allegato I (Art. 6(1)).">
                      <select value={rk.annexIActId ?? ""} onChange={e => setK({ annexIActId: e.target.value || null, annexIThirdParty: undefined })}
                        style={{ padding: "9px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, color: T.text, background: "white" }}>
                        <option value="">Nessuno di questi</option>
                        {ANNEX_I_ACTS.map(a => <option key={a.id} value={a.id}>{a.label} — {a.ref}</option>)}
                      </select>
                      {rk.annexIActId && (
                        <div style={{ marginTop: 8 }}>
                          <p style={{ fontSize: 12.5, color: T.text, margin: "0 0 6px" }}>Per immetterlo sul mercato serve la valutazione di un organismo terzo secondo quella normativa?</p>
                          <YesNo value={rk.annexIThirdParty} onChange={v => setK({ annexIThirdParty: v })} />
                        </div>
                      )}
                    </Question>

                    <Question title="Il sistema serve a una di queste cose?" hint="Casi d'uso ad alto rischio dell'Allegato III (Art. 6(2)). Se nessuna, non selezionare nulla.">
                      {ANNEX_III_USES.map(u => (
                        <Choice key={u.id} multi label={u.label} sub={u.ref} selected={!!rk.annexIII?.includes(u.id)} onClick={() => setK({ annexIII: toggle(rk.annexIII, u.id) })} />
                      ))}
                    </Question>

                    {(rk.annexIII?.length ?? 0) > 0 && (
                      <>
                        <Question title="Il sistema fa profilazione delle persone?" hint="Valuta aspetti personali (es. rendimento, affidabilità, comportamento) per prevederli o analizzarli (Art. 4(4) GDPR). Con la profilazione il sistema è sempre ad alto rischio (Art. 6(3)).">
                          <YesNo value={rk.profiling} onChange={v => setK({ profiling: v })} />
                        </Question>
                        {rk.profiling === false && (
                          <Question title="Il sistema fa solo uno di questi compiti, senza influire davvero sulla decisione?" hint="Condizioni dell'Art. 6(3). Se applichi una deroga, va documentata e il sistema va registrato.">
                            {ART63_CONDITIONS.map(c => (
                              <Choice key={c.id} label={c.label} sub={`Art. 6(3), lettera ${c.id})`} selected={rk.art63 === c.id} onClick={() => setK({ art63: c.id as Art63Condition })} />
                            ))}
                            <Choice label="No, nessuno: il sistema incide sulla decisione" selected={rk.art63 === "none"} onClick={() => setK({ art63: "none" })} />
                          </Question>
                        )}
                      </>
                    )}

                    <Question title="Il sistema fa una di queste cose?" hint="Obblighi di trasparenza dell'Art. 50: si aggiungono anche all'alto rischio.">
                      <Choice multi label="Parla o interagisce direttamente con le persone" sub="Es. chatbot, assistente vocale. Art. 50(1)." selected={!!rk.interactsWithPersons} onClick={() => setK({ interactsWithPersons: !rk.interactsWithPersons })} />
                      <Choice multi label="Genera audio, immagini, video o testi" sub="Art. 50(2)." selected={!!rk.generatesSynthetic} onClick={() => setK({ generatesSynthetic: !rk.generatesSynthetic })} />
                      {rk.generatesSynthetic && (
                        <div style={{ marginLeft: 26 }}>
                          <Choice multi label="Si limita ad assistere l'editing standard o non modifica in modo sostanziale i dati forniti" sub="In questo caso la marcatura non è richiesta (Art. 50(2))." selected={!!rk.syntheticEditingOnly} onClick={() => setK({ syntheticEditingOnly: !rk.syntheticEditingOnly })} />
                        </div>
                      )}
                      <Choice multi label="Riconosce emozioni o classifica le persone in base a dati biometrici" sub="Art. 50(3)." selected={!!rk.emotionOrBiometricCategorisation} onClick={() => setK({ emotionOrBiometricCategorisation: !rk.emotionOrBiometricCategorisation })} />
                      <Choice multi label="Lo usiamo per creare immagini, audio o video realistici di persone, luoghi o eventi (deep fake)" sub="Art. 50(4)." selected={!!rk.deepFake} onClick={() => setK({ deepFake: !rk.deepFake })} />
                      <Choice multi label="Lo usiamo per scrivere testi pubblicati per informare il pubblico su questioni di interesse pubblico" sub="Art. 50(4)." selected={!!rk.publicInterestText} onClick={() => setK({ publicInterestText: !rk.publicInterestText })} />
                      {rk.publicInterestText && (
                        <div style={{ marginLeft: 26 }}>
                          <Choice multi label="I testi passano per una revisione umana e qualcuno ne ha la responsabilità editoriale" sub="In questo caso l'obbligo non si applica (Art. 50(4))." selected={!!rk.publicInterestTextReviewed} onClick={() => setK({ publicInterestTextReviewed: !rk.publicInterestTextReviewed })} />
                        </div>
                      )}
                    </Question>

                    {ownDev && (
                      <Question title="È un modello di IA per finalità generali che mettete a disposizione di altri?" hint="Es. un grande modello linguistico che altri integrano nei loro sistemi (Art. 3(63), Capo V).">
                        <YesNo value={rk.gpaiModelProvider} onChange={v => setK({ gpaiModelProvider: v })} />
                        {rk.gpaiModelProvider && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                            <Choice multi label="Il calcolo di addestramento supera 10²⁵ FLOP o la Commissione l'ha designato come modello con rischio sistemico" sub="Artt. 51-52." selected={!!rk.gpaiSystemic} onClick={() => setK({ gpaiSystemic: !rk.gpaiSystemic })} />
                            <Choice multi label="È rilasciato con licenza libera e open source, con pesi pubblici" sub="Art. 53(2)." selected={!!rk.gpaiOpenWeights} onClick={() => setK({ gpaiOpenWeights: !rk.gpaiOpenWeights })} />
                            <Choice multi label="Era già sul mercato prima del 2 agosto 2025" sub="Art. 111(3)." selected={!!rk.gpaiPlacedBeforeAug2025} onClick={() => setK({ gpaiPlacedBeforeAug2025: !rk.gpaiPlacedBeforeAug2025 })} />
                          </div>
                        )}
                      </Question>
                    )}

                    {(ownDev || ra.developer === "third_party") && (
                      <Question title="È rilasciato con licenza libera e open source?" hint="Se non è ad alto rischio e non rientra negli Artt. 5 o 50, è escluso (Art. 2(12)).">
                        <YesNo value={rk.openSource} onChange={v => setK({ openSource: v })} />
                      </Question>
                    )}

                    {hr && (
                      <Question title="Contesto d'uso" hint="Serve a individuare gli obblighi del deployer di un sistema ad alto rischio.">
                        <Choice multi label="È usato sul luogo di lavoro e riguarda i lavoratori" sub="Art. 26(7)." selected={!!rk.workplace} onClick={() => setK({ workplace: !rk.workplace })} />
                        <Choice multi label="Prende o aiuta a prendere decisioni su persone fisiche" sub="Artt. 26(11), 86." selected={!!rk.decisionsOnPersons} onClick={() => setK({ decisionsOnPersons: !rk.decisionsOnPersons })} />
                        <Choice multi label="Tratta dati personali" sub="Art. 26(9): DPIA." selected={!!rk.personalData} onClick={() => setK({ personalData: !rk.personalData })} />
                        <Choice multi label="Era già sul mercato o in uso prima del 2 agosto 2026 e da allora non è cambiato in modo significativo" sub="Art. 111(2)." selected={!!rk.legacyNoSignificantChange} onClick={() => setK({ legacyNoSignificantChange: !rk.legacyNoSignificantChange })} />
                      </Question>
                    )}
                  </>
                )}
              </>
            )}

            {riskReady && <ResultBox title={RISK_LABEL[risk.category]} color={categoryColor} lines={risk.rationale} />}
          </>
        )}

        {/* ── Passo 3: obblighi ── */}
        {step === 2 && <ObligationsSummary roles={result.roles} obligations={result.obligations} notes={result.notes} riskTitle={RISK_LABEL[risk.category]} riskColor={categoryColor} />}

        {/* Navigazione */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
          <button type="button" disabled={step === 0} onClick={() => { persist(); setStep((step - 1) as Step); }} style={{
            fontSize: 13, padding: "9px 16px", borderRadius: 9, border: `1px solid ${T.border}`, background: "white",
            color: step === 0 ? T.faint : T.text, cursor: step === 0 ? "default" : "pointer",
          }}>Indietro</button>
          {step < 2 ? (
            <button type="button" disabled={step === 0 ? !roleReady : !riskReady} onClick={() => { persist(); setStep((step + 1) as Step); }} style={{
              fontSize: 13, fontWeight: 600, padding: "9px 18px", borderRadius: 9, border: "none",
              background: (step === 0 ? roleReady : riskReady) ? T.text : "rgba(0,0,0,0.15)", color: "white",
              cursor: (step === 0 ? roleReady : riskReady) ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: 6,
            }}>Avanti <ArrowRight size={14} /></button>
          ) : (
            <button type="button" onClick={() => { persist(); router.push(`/dashboard/tools/inventory/${system.id}`); }} style={{
              fontSize: 13, fontWeight: 600, padding: "9px 18px", borderRadius: 9, border: "none", background: T.text, color: "white", cursor: "pointer",
            }}>Salva e vai alla scheda del sistema</button>
          )}
        </div>
      </div>
    </div>
  );
}
