// Esecuzione: node --experimental-strip-types --test src/lib/obligations/engine.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { determineRoles, assessRisk, computeObligations, toolNeeds, type RoleAnswers, type RiskAnswers } from "./engine.ts";

function run(ra: RoleAnswers, rk: RiskAnswers) {
  const roles = determineRoles(ra);
  const risk = assessRisk(rk);
  const obl = computeObligations(ra, roles, risk, rk);
  return { roles, risk, obl, ids: obl.obligations.map(o => o.id) };
}

const DEPLOYER: RoleAnswers = { developer: "third_party", thirdPartyUse: ["use"], publicStatus: "none" };

test("Rossi Srl — software di selezione di terzi: deployer, alto rischio, niente FRIA (privato)", () => {
  const r = run(DEPLOYER, { aiDefinition: "infers", annexIII: ["4a"], profiling: true, workplace: true, decisionsOnPersons: true, personalData: true });
  assert.deepEqual(r.roles.roles, ["deployer"]);
  assert.equal(r.risk.category, "high_risk_annex_iii");
  for (const id of ["art4-literacy", "art26-1", "art26-2", "art26-6", "art26-7", "art26-9", "art26-11", "art86"]) assert.ok(r.ids.includes(id), id);
  assert.ok(!r.ids.includes("art27"), "FRIA non dovuta per un deployer privato fuori dai punti 5(b)-(c)");
  assert.ok(!r.ids.includes("art9"), "nessun obbligo del fornitore");
});

test("Rossi Srl — chatbot fatto fare e offerto con il proprio marchio: fornitore, trasparenza", () => {
  const r = run({ developer: "commissioned", ownUse: ["market"], publicStatus: "none" }, { aiDefinition: "infers", interactsWithPersons: true });
  assert.deepEqual(r.roles.roles, ["provider"]);
  assert.equal(r.risk.category, "transparency");
  assert.ok(r.ids.includes("art50-1"));
  assert.ok(!r.ids.includes("art50-4-df"));
});

test("Rossi Srl — ChatGPT per email interne: rischio minimo, solo Art. 4", () => {
  const r = run(DEPLOYER, { aiDefinition: "infers" });
  assert.equal(r.risk.category, "minimal");
  assert.deepEqual(r.ids, ["art4-literacy"]);
});

test("FRIA dovuta per il credit scoring (All. III 5(b)) anche per un deployer privato", () => {
  const r = run(DEPLOYER, { aiDefinition: "infers", annexIII: ["5b"], profiling: true });
  assert.ok(r.ids.includes("art27"));
});

test("FRIA e registrazione per l'autorità pubblica, ma non per le infrastrutture critiche (punto 2)", () => {
  const pa: RoleAnswers = { ...DEPLOYER, publicStatus: "public_authority" };
  const edu = run(pa, { aiDefinition: "infers", annexIII: ["3a"], profiling: true });
  assert.ok(edu.ids.includes("art27") && edu.ids.includes("art26-8"));
  const infra = run(pa, { aiDefinition: "infers", annexIII: ["2"], profiling: true });
  assert.ok(!infra.ids.includes("art27") && !infra.ids.includes("art26-8"));
});

test("Art. 6(3): la deroga vale senza profilazione, la profilazione la esclude", () => {
  const prov: RoleAnswers = { developer: "us", ownUse: ["market"], publicStatus: "none" };
  const exempt = run(prov, { aiDefinition: "infers", annexIII: ["4a"], profiling: false, art63: "d" });
  assert.equal(exempt.risk.category, "annex_iii_exempt");
  assert.ok(exempt.ids.includes("art6-4") && exempt.ids.includes("art49-2"));
  assert.ok(!exempt.ids.includes("art9"));
  const blocked = run(prov, { aiDefinition: "infers", annexIII: ["4a"], profiling: true, art63: "d" });
  assert.equal(blocked.risk.category, "high_risk_annex_iii");
  assert.ok(blocked.risk.profilingOverride);
});

test("Art. 50 si cumula con l'alto rischio (Art. 50(6))", () => {
  const r = run({ developer: "us", ownUse: ["market"], publicStatus: "none" }, { aiDefinition: "infers", annexIII: ["4a"], profiling: true, interactsWithPersons: true });
  assert.equal(r.risk.category, "high_risk_annex_iii");
  assert.ok(r.ids.includes("art9") && r.ids.includes("art50-1"));
});

test("Fornitore extra-UE di sistema ad alto rischio: rappresentante autorizzato Art. 22", () => {
  const r = run({ developer: "us", ownUse: ["market"], publicStatus: "none", establishedOutsideEU: true }, { aiDefinition: "infers", annexIII: ["5c"], profiling: true });
  assert.ok(r.ids.includes("art22"));
});

test("Art. 25(1): il deployer che cambia finalità rendendo il sistema ad alto rischio diventa fornitore", () => {
  const ra: RoleAnswers = { ...DEPLOYER, art25: ["purpose_change"] };
  const r = run(ra, { aiDefinition: "infers", annexIII: ["4a"], profiling: true });
  assert.ok(r.obl.roles.includes("provider"));
  assert.ok(r.ids.includes("art9") && r.ids.includes("art26-1"));
  const low = run(ra, { aiDefinition: "infers" });
  assert.ok(!low.obl.roles.includes("provider"));
});

test("Pratica vietata: stop, con eccezione per motivi medici sulla lettera f)", () => {
  const banned = run(DEPLOYER, { aiDefinition: "infers", art5: ["f"] });
  assert.equal(banned.risk.category, "prohibited");
  assert.ok(banned.ids.includes("art5-stop"));
  const medical = run(DEPLOYER, { aiDefinition: "infers", art5: ["f"], art5Exceptions: ["f"] });
  assert.notEqual(medical.risk.category, "prohibited");
});

test("Allegato I sezione A: alto rischio dal 2 agosto 2028 (Omnibus), niente registrazione Art. 49", () => {
  const r = run({ developer: "us", ownUse: ["market"], publicStatus: "none" }, { aiDefinition: "infers", annexIActId: "medical_devices", annexIThirdParty: true });
  assert.equal(r.risk.category, "high_risk_annex_i");
  const art9 = r.obl.obligations.find(o => o.id === "art9")!;
  assert.equal(art9.appliesFrom, "2028-08-02");
  assert.ok(!r.ids.includes("art49-1"));
});

test("Allegato I senza valutazione di terzi: non alto rischio per Art. 6(1)", () => {
  const r = run(DEPLOYER, { aiDefinition: "infers", annexIActId: "toys", annexIThirdParty: false });
  assert.equal(r.risk.category, "minimal");
});

test("Open source non ad alto rischio: escluso (Art. 2(12)); non escluso se Art. 50", () => {
  assert.equal(assessRisk({ aiDefinition: "infers", openSource: true }).category, "out_of_scope");
  assert.equal(assessRisk({ aiDefinition: "infers", openSource: true, interactsWithPersons: true }).category, "transparency");
});

test("Solo regole scritte da persone: non è un sistema di IA", () => {
  const r = run(DEPLOYER, { aiDefinition: "rules_only" });
  assert.equal(r.risk.category, "not_ai");
  assert.equal(r.ids.length, 0);
});

test("GPAI open source senza rischio sistemico: esonero da 53(1)(a)-(b) ma non da copyright e sintesi", () => {
  const r = run({ developer: "us", ownUse: ["market"], publicStatus: "none", establishedOutsideEU: true }, { aiDefinition: "infers", gpaiModelProvider: true, gpaiOpenWeights: true });
  assert.ok(!r.ids.includes("art53-a") && !r.ids.includes("art54"));
  assert.ok(r.ids.includes("art53-c") && r.ids.includes("art53-d"));
  const sys = run({ developer: "us", ownUse: ["market"], publicStatus: "none" }, { aiDefinition: "infers", gpaiModelProvider: true, gpaiSystemic: true, gpaiOpenWeights: true });
  assert.ok(sys.ids.includes("art53-a") && sys.ids.includes("art55") && sys.ids.includes("art52"));
});

test("Sistema già in servizio prima del 2/8/2026 usato da autorità pubblica: termine 2/8/2030", () => {
  const r = run({ ...DEPLOYER, publicStatus: "public_authority" }, { aiDefinition: "infers", annexIII: ["5a"], profiling: true, legacyNoSignificantChange: true });
  assert.equal(r.obl.obligations.find(o => o.id === "art26-1")!.appliesFrom, "2030-08-02");
});

test("Sviluppo interno usato internamente: fornitore e deployer insieme", () => {
  const r = determineRoles({ developer: "us", ownUse: ["internal_use"], publicStatus: "none" });
  assert.deepEqual(r.roles.sort(), ["deployer", "provider"]);
});

test("Omnibus: Allegato III dal 2 dicembre 2027", () => {
  const r = run(DEPLOYER, { aiDefinition: "infers", annexIII: ["4a"], profiling: true });
  assert.equal(r.obl.obligations.find(o => o.id === "art26-1")!.appliesFrom, "2027-12-02");
});

test("Omnibus: regolamento macchine nell'Allegato I, sezione B", () => {
  const r = run({ developer: "us", ownUse: ["market"], publicStatus: "none" }, { aiDefinition: "infers", annexIActId: "machinery", annexIThirdParty: true });
  assert.equal(r.risk.annexIAct?.section, "B");
  assert.ok(!r.ids.includes("art9"), "sezione B: requisiti tramite la normativa di settore");
});

test("Omnibus: nuovi divieti Art. 5(1)(ba)-(bb) dal 2 dicembre 2026", () => {
  const r = run(DEPLOYER, { aiDefinition: "infers", art5: ["ba"] });
  assert.equal(r.risk.category, "prohibited");
  assert.equal(r.obl.obligations.find(o => o.id === "art5-stop")!.appliesFrom, "2026-12-02");
  const mixed = run(DEPLOYER, { aiDefinition: "infers", art5: ["ba", "c"] });
  assert.equal(mixed.obl.obligations.find(o => o.id === "art5-stop")!.appliesFrom, "2025-02-02");
});

test("Omnibus: marcatura Art. 50(2) entro il 2 dicembre 2026 per i sistemi già sul mercato (Art. 111(4))", () => {
  const prov: RoleAnswers = { developer: "us", ownUse: ["market"], publicStatus: "none" };
  const old = run(prov, { aiDefinition: "infers", generatesSynthetic: true, syntheticPlacedBeforeAug2026: true });
  assert.equal(old.obl.obligations.find(o => o.id === "art50-2")!.appliesFrom, "2026-12-02");
  const fresh = run(prov, { aiDefinition: "infers", generatesSynthetic: true });
  assert.equal(fresh.obl.obligations.find(o => o.id === "art50-2")!.appliesFrom, "2026-08-02");
});

test("Menu: i tool necessari derivano dagli obblighi dei sistemi classificati", () => {
  const none = toolNeeds([{ name: "Non classificato" }]);
  assert.equal(none.assessed, 0);
  const n = toolNeeds([
    { name: "Selezione CV", roleAnswers: DEPLOYER, riskAnswers: { aiDefinition: "infers", annexIII: ["4a"], profiling: true, personalData: true } },
    { name: "ChatGPT email", roleAnswers: DEPLOYER, riskAnswers: { aiDefinition: "infers" } },
  ]);
  assert.equal(n.assessed, 2);
  assert.deepEqual(n.roles, ["deployer"]);
  assert.deepEqual(n.tools["/dashboard/tools/literacy"].systems, ["Selezione CV", "ChatGPT email"]);
  for (const href of ["/dashboard/tools/deployer-dashboard", "/dashboard/tools/oversight", "/dashboard/tools/logvault", "/dashboard/tools/dpia", "/dashboard/post-market", "/dashboard/tools/drift-monitor"]) {
    assert.deepEqual(n.tools[href]?.systems, ["Selezione CV"], href);
  }
  for (const href of ["/dashboard/tools/risk-manager", "/dashboard/tools/qms", "/dashboard/tools/conformity", "/dashboard/tools/fria"]) {
    assert.ok(!n.tools[href], href + " non serve a un deployer privato");
  }
});

test("Menu: chi dichiara una circostanza dell'Art. 25 vede il cambio di ruolo", () => {
  const n = toolNeeds([{ name: "Chatbot", roleAnswers: { ...DEPLOYER, art25: ["own_brand"] }, riskAnswers: { aiDefinition: "infers", interactsWithPersons: true } }]);
  assert.ok(n.tools["/dashboard/compliance-ops/provider-transition"]);
});
