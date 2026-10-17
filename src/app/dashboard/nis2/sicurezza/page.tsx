"use client";

// Sicurezza dei documenti NIS 2: stato della chiave di cifratura, chiave di recupero, importazione.

import React, { useEffect, useState } from "react";
import { Download, KeyRound, Lock } from "lucide-react";
import { INK, LINE, OK, fieldStyle, ToolHeader, Note, PrimaryButton, SecondaryButton } from "@/components/tools/ToolUi";
import { KEY_EVENT, exportRecoveryKey, getKey, getOrCreateKey, importRecoveryKey, keyFingerprint } from "@/lib/nis2/crypto";
import { fileStorage } from "@/lib/nis2/file-storage";
import { useT } from "@/i18n/LocaleProvider";

export default function Nis2SecurityPage() {
  const t = useT("nis2");
  const [fp, setFp] = useState<string | null | undefined>(undefined);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      getKey().catch(() => undefined)
        .then((key) => (key ? keyFingerprint(key) : null))
        .then((f) => { if (alive) setFp(f); });
    };
    load();
    window.addEventListener(KEY_EVENT, load);
    return () => { alive = false; window.removeEventListener(KEY_EVENT, load); };
  }, []);

  async function create() {
    await getOrCreateKey();
    setMsg({ ok: true, text: t("sec_created") });
  }

  async function download() {
    const key = await exportRecoveryKey();
    const body = `${t("sec_file_header")}\n\n${key}\n\n${t("sec_file_footer")}\n`;
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "RegulaeOS_NIS2_chiave_di_recupero.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function doImport() {
    setMsg(null);
    if (fp && !window.confirm(t("sec_replace_confirm"))) return;
    try {
      const newFp = await importRecoveryKey(text);
      setText("");
      setMsg({ ok: true, text: `${t("sec_imported")} ${newFp}` });
    } catch {
      setMsg({ ok: false, text: t("sec_invalid") });
    }
  }

  return (
    <div style={{ maxWidth: 760, color: INK }}>
      <ToolHeader title={t("security")} subtitle={t("sec_sub")} />

      <section style={{ padding: "18px 0", borderTop: `1px solid ${LINE}`, display: "flex", flexDirection: "column", gap: 8, fontSize: 13, lineHeight: 1.55 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 8 }}><Lock size={15} /> {t("sec_how")}</h2>
        <p style={{ margin: 0 }}>{t("sec_how_1")}</p>
        <p style={{ margin: 0 }}>{t(fileStorage.kind === "cloud" ? "sec_where_cloud" : "sec_where_local")}</p>
      </section>

      <section style={{ padding: "18px 0", borderTop: `1px solid ${LINE}`, display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 8 }}><KeyRound size={15} /> {t("sec_key")}</h2>
        {fp === undefined ? null : fp ? (
          <p style={{ fontSize: 13, margin: 0 }}>{t("sec_key_active")} <strong style={{ fontWeight: 600, fontFamily: "'DM Mono', monospace", color: OK }}>{fp}</strong></p>
        ) : (
          <p style={{ fontSize: 13, margin: 0 }}>{t("sec_key_none")}</p>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {fp ? (
            <PrimaryButton onClick={() => void download()}><Download size={14} /> {t("sec_download")}</PrimaryButton>
          ) : (
            <PrimaryButton onClick={() => void create()}><KeyRound size={14} /> {t("sec_create")}</PrimaryButton>
          )}
        </div>
        <Note warn>{t("sec_warn")}</Note>
      </section>

      <section style={{ padding: "18px 0", borderTop: `1px solid ${LINE}`, display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{t("sec_import")}</h2>
        <Note>{t("sec_import_hint")}</Note>
        <textarea style={{ ...fieldStyle, minHeight: 70, fontFamily: "'DM Mono', monospace", fontSize: 12 }} placeholder="RGOS-NIS2-KEY-v1:…" aria-label={t("sec_import")}
          value={text} onChange={(e) => setText(e.target.value)} />
        <div><SecondaryButton onClick={() => void doImport()} disabled={!text.trim()}>{t("sec_import_btn")}</SecondaryButton></div>
        {msg && <Note warn={!msg.ok}>{msg.text}</Note>}
      </section>
    </div>
  );
}
