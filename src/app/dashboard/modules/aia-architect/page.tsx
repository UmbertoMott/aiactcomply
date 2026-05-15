"use client";

import { useState } from "react";
import {
  Box,
  GitBranch,
  Database,
  FileCode,
  Download,
  CheckCircle,
  Code2,
} from "lucide-react";
import { analyzeCodeAST, generateAnnexIVJSON, signDocument } from "@/lib/simulation/ast-parser";
import { sha256 } from "@/lib/crypto/hash";

const CODE_SAMPLE = `def clean_data(df):
    """Rimuove duplicati e valori nulli dal dataset"""
    df = df.drop_duplicates()
    df = df.dropna()
    return df

def normalize_age(df):
    """Normalizza la colonna eta' in range [0,1]"""
    df['age_norm'] = (df['eta'] - df['eta'].min()) / (df['eta'].max() - df['eta'].min())
    return df

def encode_categorical(df):
    """One-hot encoding delle variabili categoriche"""
    return pd.get_dummies(df, columns=['genere', 'titolo_studio'])

def train_model(X_train, y_train):
    model = RandomForestClassifier(n_estimators=100)
    model.fit(X_train, y_train)
    return model

def predict_candidate(model, X_test):
    return model.predict_proba(X_test)`;

export default function AIAArchitectPage() {
  const [tab, setTab] = useState<"editor" | "ast" | "annex">("editor");
  const [code, setCode] = useState(CODE_SAMPLE);
  const [parsed, setParsed] = useState<ReturnType<typeof analyzeCodeAST> | null>(null);
  const [annex, setAnnex] = useState<ReturnType<typeof generateAnnexIVJSON> | null>(null);
  const [signed, setSigned] = useState(false);

  async function runAST() {
    const result = analyzeCodeAST(code);
    setParsed(result);
    setTab("ast");
  }

  async function generateDoc() {
    const functions = parsed || analyzeCodeAST(code);
    const doc = generateAnnexIVJSON("CV-Screener v2.3", functions);
    const signedDoc = await signDocument(doc);
    setAnnex(signedDoc);
    setSigned(true);
    setTab("annex");
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">AIA-Architect</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Motore AST Parser: analisi semantica del codice → mappatura automatica Art. 10 → Dossier Vivente
          Annex IV firmato SHA-256.
        </p>
      </div>

      {/* Tab nav */}
      <div className="flex items-center gap-1 border border-border rounded-xl bg-card p-1 mb-6">
        {[
          { id: "editor" as const, label: "Editor Codice", icon: Code2 },
          { id: "ast" as const, label: "AST Scan", icon: GitBranch },
          { id: "annex" as const, label: "Annex IV JSON", icon: FileCode },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5 inline mr-1.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "editor" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              Codice Sorgente — src/model/pipeline.py
            </h2>
            <div className="flex gap-2">
              <button onClick={runAST} className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                Esegui AST Scan
              </button>
              <button onClick={generateDoc} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                Genera Annex IV
              </button>
            </div>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full bg-card px-5 py-4 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
            style={{ minHeight: "300px" }}
            placeholder="Incolla il codice del tuo sistema AI..."
          />
        </div>
      )}

      {tab === "ast" && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              Risultati AST Scan — mapping semantico Art. 10
            </h2>
            <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              {parsed?.length || 0} funzioni trovate
            </span>
          </div>
          {!parsed ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              Esegui l&apos;AST Scan nell&apos;editor per vedere i risultati.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {parsed.map((fn, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-mono text-foreground">{fn.name}</span>
                      <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                        {fn.type}
                      </span>
                      {fn.art10Relevant && (
                        <span className="text-[10px] font-medium text-primary bg-primary/10 rounded px-1.5 py-0.5">
                          Art. 10
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {fn.file}:{fn.line}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">{fn.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "annex" && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              Dossier Vivente — Allegato IV
            </h2>
            <div className="flex items-center gap-3">
              {signed && (
                <span className="text-[10px] text-success flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Firmato SHA-256
                </span>
              )}
              <button className="rounded-lg border border-border px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                <Download className="h-3 w-3" />
                Esporta JSON
              </button>
            </div>
          </div>
          {!annex ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              Genera il documento dall&apos;editor o dall&apos;AST Scan.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {annex.sections.map((sec) => (
                <details key={sec.id} className="px-5 py-3 group">
                  <summary className="text-sm font-medium text-foreground cursor-pointer hover:text-primary transition-colors flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-muted-foreground group-open:text-primary" />
                    {sec.title}
                    <span className="text-[10px] text-muted-foreground font-mono">({sec.id})</span>
                  </summary>
                  <pre className="mt-3 text-xs text-muted-foreground bg-muted rounded-lg p-4 overflow-x-auto font-mono">
                    {sec.content}
                  </pre>
                </details>
              ))}
            </div>
          )}
          {annex && (
            <div className="px-5 py-3 border-t border-border text-[10px] text-muted-foreground font-mono">
              Root hash: {annex.rootHash} | Signature: {annex.signature.slice(0, 40)}...
            </div>
          )}
        </div>
      )}

      {/* Data lineage section (unchanged) */}
      {parsed && (
        <div className="rounded-xl border border-border bg-card p-5 mt-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Data Lineage Column-Level — Art. 10</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 text-[10px] text-muted-foreground font-medium uppercase">Fonte</th>
                  <th className="text-left px-3 py-2 text-[10px] text-muted-foreground font-medium uppercase">Colonna</th>
                  <th className="text-left px-3 py-2 text-[10px] text-muted-foreground font-medium uppercase">Feature</th>
                  <th className="text-left px-3 py-2 text-[10px] text-muted-foreground font-medium uppercase">Trasformaz.</th>
                  <th className="text-center px-3 py-2 text-[10px] text-muted-foreground font-medium uppercase">Bias</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { source: "DB_utenti", col: "eta", feat: "age_group", xform: "binning(0-18,19-35,36-65,65+)", bias: 23 },
                  { source: "DB_utenti", col: "reddito", feat: "income_bracket", xform: "binning + scaling", bias: 45 },
                  { source: "DB_utenti", col: "cap_residenza", feat: "district", xform: "one-hot encoding", bias: 12 },
                  { source: "DB_storico", col: "esito_precedente", feat: "prev_outcome", xform: "label encoding", bias: 8 },
                  { source: "Snowflake.prod", col: "codice_settore", feat: "sector", xform: "entity embedding", bias: 67 },
                ].map((row) => (
                  <tr key={row.col} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{row.source}</td>
                    <td className="px-3 py-2 text-xs text-foreground">{row.col}</td>
                    <td className="px-3 py-2 text-xs text-primary">{row.feat}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{row.xform}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-[10px] font-mono font-medium rounded-full px-2 py-0.5 ${
                        row.bias > 40 ? "bg-danger/10 text-danger" : row.bias > 20 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                      }`}>{row.bias}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
