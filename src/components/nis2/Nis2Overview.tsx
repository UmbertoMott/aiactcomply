"use client";

// Panoramica NIS 2: un riquadro piccolo per ogni requisito (codice, punto, testo),
// filtrabile per funzione e cercabile. Stesso stile dei tool AI Act.

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { INK, LINE, OK, WARN, fieldStyle, ToolHeader, Choice } from "@/components/tools/ToolUi";
import { NIS2_FUNCTIONS, NIS2_SETS, type Nis2Function, type Nis2Profile } from "@/lib/nis2/requirements";
import { useNis2All, useNis2Profile, type Nis2Entry, type Nis2Status } from "@/lib/nis2/store";
import { useT } from "@/i18n/LocaleProvider";

const STATUS_COLOR: Record<Nis2Status, string> = { todo: "rgba(0,0,0,0.25)", progress: WARN, done: OK };

function Tile({ href, code, sub, text, entry, t }: { href: string; code: string; sub?: string; text: string; entry?: Nis2Entry; t: (k: string) => string }) {
  const status = entry?.status ?? "todo";
  const docs = entry?.docs.length ?? 0;
  return (
    <Link href={href} className="nis2-tile" style={{
      display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px", border: `1px solid ${LINE}`, borderRadius: 8,
      color: INK, textDecoration: "none", background: "#fff", minHeight: 108,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: STATUS_COLOR[status], flexShrink: 0 }} title={t(`status_${status}`)} />
        <strong style={{ fontWeight: 600 }}>{code}</strong>
        {sub && <span>{sub}</span>}
        {docs > 0 && (
          <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11 }} title={`${docs} ${t("docs")}`}>
            <FileText size={11} /> {docs}
          </span>
        )}
      </div>
      <p style={{
        margin: 0, fontSize: 12, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>{text}</p>
    </Link>
  );
}

/** Scelta della categoria del soggetto NIS (essenziale o importante) */
export function Nis2ProfileChooser({ onChoose }: { onChoose: (p: Nis2Profile) => void }) {
  const t = useT("nis2");
  return (
    <div style={{ maxWidth: 900, color: INK }}>
      <h1 style={{ margin: 0 }}>{t("profile_title")}</h1>
      <p style={{ fontSize: 14, margin: "8px 0 24px", lineHeight: 1.5 }}>{t("profile_sub")}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {(["essenziale", "importante"] as Nis2Profile[]).map((p) => (
          <button key={p} type="button" onClick={() => onChoose(p)} style={{
            display: "flex", flexDirection: "column", gap: 8, padding: 22, border: `1px solid ${LINE}`, borderRadius: 10,
            background: "#fff", color: INK, textAlign: "left", cursor: "pointer", fontFamily: "inherit",
          }}>
            <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 22, fontWeight: 700 }}>{t(`profile_${p}`)}</span>
            <span style={{ fontSize: 13.5, lineHeight: 1.5 }}>{t(`profile_${p}_desc`)}</span>
            <span style={{ fontSize: 13, marginTop: 6 }}>{NIS2_SETS[p].requirements.length} {t("requirements")} · {NIS2_SETS[p].incidents.length} {t("incidents_short").toLowerCase()}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Riga con la categoria scelta e il link per cambiarla */
function ProfileLine({ profile, onChange }: { profile: Nis2Profile; onChange: () => void }) {
  const t = useT("nis2");
  return (
    <p style={{ fontSize: 13, margin: "-8px 0 18px", display: "flex", gap: 10, alignItems: "center" }}>
      <strong style={{ fontWeight: 600 }}>{t(`profile_${profile}`)}</strong>
      <button type="button" onClick={onChange} style={{ background: "none", border: "none", padding: 0, color: INK, textDecoration: "underline", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
        {t("profile_change")}
      </button>
    </p>
  );
}

export function Nis2Overview({ fn, incidents }: { fn?: Nis2Function; incidents?: boolean }) {
  const [profile, setProfile] = useNis2Profile();
  if (!profile) return <Nis2ProfileChooser onChoose={setProfile} />;
  return <Nis2OverviewFor profile={profile} fn={fn} incidents={incidents} onChangeProfile={() => setProfile(null)} />;
}

function Nis2OverviewFor({ profile, fn, incidents, onChangeProfile }: { profile: Nis2Profile; fn?: Nis2Function; incidents?: boolean; onChangeProfile: () => void }) {
  const t = useT("nis2");
  const all = useNis2All(profile);
  const { requirements: NIS2_REQUIREMENTS, incidents: NIS2_INCIDENTS } = NIS2_SETS[profile];
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Nis2Status | "all">("all");

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return NIS2_REQUIREMENTS.filter((r) =>
      (!fn || r.fn === fn) &&
      (status === "all" || (all[r.id]?.status ?? "todo") === status) &&
      (!needle || r.code.toLowerCase().includes(needle) || r.text.toLowerCase().includes(needle) || r.measure.toLowerCase().includes(needle)));
  }, [fn, q, status, all, NIS2_REQUIREMENTS]);

  const scope = fn ? NIS2_REQUIREMENTS.filter((r) => r.fn === fn) : NIS2_REQUIREMENTS;
  const done = scope.filter((r) => all[r.id]?.status === "done").length;
  const pct = Math.round((done / scope.length) * 100);

  if (incidents) {
    return (
      <div style={{ maxWidth: 1100, color: INK }}>
        <ToolHeader title={t("incidents")} subtitle={t("incidents_sub")} note={t("note")} />
        <ProfileLine profile={profile} onChange={onChangeProfile} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
          {NIS2_INCIDENTS.map((i) => <Tile key={i.id} href={`/dashboard/nis2/${encodeURIComponent(i.id)}`} code={i.code} text={i.text} entry={all[i.id]} t={t} />)}
        </div>
      </div>
    );
  }

  // Raggruppa per funzione (in vista filtrata c'è un solo gruppo)
  const groups = (fn ? [fn] : NIS2_FUNCTIONS).map((f) => ({ f, items: list.filter((r) => r.fn === f) })).filter((g) => g.items.length > 0);

  return (
    <div style={{ maxWidth: 1100, color: INK }}>
      <ToolHeader title={fn ? `${fn} — ${t(`fn_${fn}`)}` : t("title")} subtitle={fn ? undefined : t("sub")} note={fn ? undefined : t("note")} />
      <ProfileLine profile={profile} onChange={onChangeProfile} />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 220px", maxWidth: 360 }}>
          <input style={fieldStyle} placeholder={t("search")} aria-label={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["all", "todo", "progress", "done"] as const).map((s) => (
            <Choice key={s} active={status === s} onClick={() => setStatus(s)}>{s === "all" ? t("all") : t(`status_${s}`)}</Choice>
          ))}
        </div>
        <div style={{ marginLeft: "auto", fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
          <span>{done}/{scope.length} {t("done_of")}</span>
          <span style={{ width: 120, height: 4, background: LINE, borderRadius: 99, overflow: "hidden", display: "inline-block" }}>
            <span style={{ display: "block", width: `${pct}%`, height: "100%", background: OK }} />
          </span>
        </div>
      </div>

      {groups.length === 0 && <p style={{ fontSize: 13 }}>{t("no_results")}</p>}

      {groups.map(({ f, items }) => (
        <section key={f} style={{ padding: "16px 0", borderTop: `1px solid ${LINE}` }}>
          {!fn && (
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px", display: "flex", alignItems: "baseline", gap: 8 }}>
              <Link href={`/dashboard/nis2/f/${f}`} style={{ color: INK, textDecoration: "none" }}>{f} — {t(`fn_${f}`)}</Link>
              <span style={{ fontSize: 12, fontWeight: 400 }}>{items.length} {t("requirements")}</span>
            </h2>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {items.map((r) => (
              <Tile key={r.id} href={`/dashboard/nis2/${encodeURIComponent(r.id)}`} code={r.code} sub={`· ${t("point")} ${r.point}`} text={r.text} entry={all[r.id]} t={t} />
            ))}
          </div>
        </section>
      ))}

      {!fn && !q && status === "all" && (
        <section style={{ padding: "16px 0", borderTop: `1px solid ${LINE}` }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px" }}>
            <Link href="/dashboard/nis2/incidenti" style={{ color: INK, textDecoration: "none" }}>{t("incidents")}</Link>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {NIS2_INCIDENTS.map((i) => <Tile key={i.id} href={`/dashboard/nis2/${encodeURIComponent(i.id)}`} code={i.code} text={i.text} entry={all[i.id]} t={t} />)}
          </div>
        </section>
      )}
    </div>
  );
}
