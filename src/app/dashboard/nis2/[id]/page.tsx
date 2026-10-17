"use client";

// Requisito NIS 2: testo ufficiale, stato, documenti (salvati nel browser) e annotazioni.

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, FileText, Lock, Upload, X } from "lucide-react";
import { INK, LINE, fieldStyle, Choice, Note, SecondaryButton } from "@/components/tools/ToolUi";
import { NIS2_SETS, findNis2Item, type Nis2Profile } from "@/lib/nis2/requirements";
import { MAX_FILE_BYTES, useNis2Entry, useNis2Profile, type Nis2DocMeta, type Nis2Status } from "@/lib/nis2/store";
import { readDocument, removeDocument, saveDocument } from "@/lib/nis2/documents";
import { fileStorage } from "@/lib/nis2/file-storage";
import { Nis2ProfileChooser } from "@/components/nis2/Nis2Overview";
import { useLocale, useT } from "@/i18n/LocaleProvider";


function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,160px) 1fr", gap: 12, padding: "10px 0", borderTop: `1px solid ${LINE}`, fontSize: 13, lineHeight: 1.55 }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span>{children}</span>
    </div>
  );
}

export default function Nis2RequirementPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const [profile, setProfile] = useNis2Profile();
  if (!profile) return <Nis2ProfileChooser onChoose={setProfile} />;
  return <RequirementView key={`${profile}:${id}`} profile={profile} id={id} />;
}

function RequirementView({ profile, id }: { profile: Nis2Profile; id: string }) {
  const t = useT("nis2");
  const locale = useLocale();
  const found = findNis2Item(profile, id);
  const [entry, update] = useNis2Entry(profile, id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!found) {
    return (
      <div style={{ color: INK }}>
        <p style={{ fontSize: 13 }}>{t("not_found")}</p>
        <Link href="/dashboard/nis2" style={{ fontSize: 13, color: INK }}>{t("back")}</Link>
      </div>
    );
  }

  const set = NIS2_SETS[profile];
  const ORDER = [...set.requirements.map((r) => r.id), ...set.incidents.map((i) => i.id)];
  const idx = ORDER.indexOf(id);
  const prev = idx > 0 ? ORDER[idx - 1] : null;
  const next = idx < ORDER.length - 1 ? ORDER[idx + 1] : null;
  const isReq = found.kind === "req";
  const title = isReq ? `${found.item.code} · ${t("point")} ${found.item.point}` : found.item.code;

  async function addFiles(files: FileList) {
    setError(null);
    const added: Nis2DocMeta[] = [];
    setBusy(true);
    for (const f of Array.from(files)) {
      if (f.size > MAX_FILE_BYTES) { setError(`${f.name}: ${t("too_big")}`); continue; }
      try {
        added.push(await saveDocument(f));
      } catch {
        setError(t("file_error"));
      }
    }
    setBusy(false);
    if (added.length) update({ docs: [...entry.docs, ...added], status: entry.status === "todo" ? "progress" : entry.status });
    if (fileRef.current) fileRef.current.value = "";
  }

  async function openDoc(doc: Nis2DocMeta) {
    const name = doc.name;
    let blob: Blob;
    try {
      blob = await readDocument(doc);
    } catch (e) {
      setError(t((e as Error).message === "missing_key" ? "key_missing" : "open_error"));
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    if (!blob.type || !/pdf|image|text/.test(blob.type)) a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function removeDoc(doc: Nis2DocMeta) {
    await removeDocument(doc).catch(() => undefined);
    update({ docs: entry.docs.filter((d) => d.id !== doc.id) });
  }

  const fmtSize = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
  const fmtDate = (s: string) => new Date(s).toLocaleDateString(locale === "en" ? "en-GB" : "it-IT");

  return (
    <div style={{ maxWidth: 820, color: INK }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginBottom: 14 }}>
        <Link href={isReq ? `/dashboard/nis2/f/${found.item.fn}` : "/dashboard/nis2/incidenti"} style={{ color: INK, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ChevronLeft size={14} /> {isReq ? `${found.item.fn} — ${t(`fn_${found.item.fn}`)}` : t("incidents")}
        </Link>
        <span style={{ marginLeft: "auto", display: "inline-flex", gap: 14 }}>
          {prev && <Link href={`/dashboard/nis2/${encodeURIComponent(prev)}`} style={{ color: INK, display: "inline-flex", alignItems: "center", gap: 2 }}><ChevronLeft size={14} />{t("prev")}</Link>}
          {next && <Link href={`/dashboard/nis2/${encodeURIComponent(next)}`} style={{ color: INK, display: "inline-flex", alignItems: "center", gap: 2 }}>{t("next")}<ChevronRight size={14} /></Link>}
        </span>
      </div>

      <h1 style={{ margin: "0 0 4px" }}>{title}</h1>
      <p style={{ fontSize: 12.5, margin: "0 0 14px" }}>{t(`profile_${profile}`)}</p>

      {isReq ? (
        <>
          <Row label={t("measure")}>{found.item.measure}</Row>
          <Row label={t("requirement")}>{found.item.text}</Row>
          {found.item.policy && <Row label={t("policy")}>{found.item.policy}</Row>}
        </>
      ) : (
        <Row label={t("incident")}>{found.item.text}</Row>
      )}

      <section style={{ padding: "18px 0", borderTop: `1px solid ${LINE}` }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 10px" }}>{t("status")}</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["todo", "progress", "done"] as Nis2Status[]).map((s) => (
            <Choice key={s} active={entry.status === s} onClick={() => update({ status: s })}>{t(`status_${s}`)}</Choice>
          ))}
        </div>
      </section>

      <section style={{ padding: "18px 0", borderTop: `1px solid ${LINE}`, display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{t("documents")}</h2>
        <Note>{t("documents_hint")}</Note>
        <p style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>
          <Lock size={14} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{t(fileStorage.kind === "cloud" ? "enc_note_cloud" : "enc_note_local")} <Link href="/dashboard/nis2/sicurezza" style={{ color: INK }}>{t("security")}</Link></span>
        </p>
        {entry.docs.length === 0 ? (
          <p style={{ fontSize: 12.5, margin: 0 }}>{t("no_docs")}</p>
        ) : (
          entry.docs.map((d) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, paddingBottom: 6, borderBottom: `1px solid ${LINE}` }}>
              {d.iv ? <span title={t("encrypted")} style={{ display: "inline-flex" }}><Lock size={13} style={{ flexShrink: 0 }} /></span> : <FileText size={14} style={{ flexShrink: 0 }} />}
              <button type="button" onClick={() => void openDoc(d)} title={t("open")}
                style={{ background: "none", border: "none", padding: 0, color: INK, cursor: "pointer", textDecoration: "underline", fontSize: 13, fontFamily: "inherit", textAlign: "left", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {d.name}
              </button>
              <span style={{ fontSize: 12, whiteSpace: "nowrap" }}>{fmtSize(d.size)} · {fmtDate(d.addedAt)}</span>
              <button type="button" onClick={() => void removeDoc(d)} aria-label={t("remove")} title={t("remove")}
                style={{ background: "none", border: "none", cursor: "pointer", color: INK, padding: 2, display: "inline-flex" }}>
                <X size={14} />
              </button>
            </div>
          ))
        )}
        <div>
          <SecondaryButton onClick={() => fileRef.current?.click()} disabled={busy}><Upload size={14} /> {busy ? t("encrypting") : t("add_file")}</SecondaryButton>
          <input ref={fileRef} type="file" multiple hidden onChange={(e) => { if (e.target.files?.length) void addFiles(e.target.files); }} />
        </div>
        {error && <Note warn>{error}</Note>}
      </section>

      <section style={{ padding: "18px 0", borderTop: `1px solid ${LINE}`, display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{t("notes")}</h2>
        <textarea style={{ ...fieldStyle, minHeight: 140, resize: "vertical", lineHeight: 1.55 }} placeholder={t("notes_ph")} aria-label={t("notes")}
          value={entry.notes} onChange={(e) => update({ notes: e.target.value })} />
        {entry.updatedAt && <span style={{ fontSize: 12 }}>{t("saved")} · {fmtDate(entry.updatedAt)}</span>}
      </section>
    </div>
  );
}
