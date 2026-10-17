"use client";

// Scelta dell'area dopo il login: AI Act (dashboard attuale) oppure NIS 2.

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Network, ShieldCheck } from "lucide-react";
import { INK, LINE, OK } from "@/components/tools/ToolUi";
import { NIS2_SETS } from "@/lib/nis2/requirements";
import { useNis2All, useNis2Profile } from "@/lib/nis2/store";
import { loadInventory } from "@/lib/inventory/ai-system";
import { useT } from "@/i18n/LocaleProvider";

function AreaCard({ href, icon, name, law, desc, stat, enter }: {
  href: string; icon: React.ReactNode; name: string; law: string; desc: string; stat?: string; enter: string;
}) {
  return (
    <Link href={href} style={{
      display: "flex", flexDirection: "column", gap: 10, padding: 24, border: `1px solid ${LINE}`, borderRadius: 10,
      color: INK, textDecoration: "none", background: "#fff", minHeight: 220,
    }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        {icon}
        <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 26, fontWeight: 700 }}>{name}</span>
      </span>
      <span style={{ fontSize: 12.5 }}>{law}</span>
      <span style={{ fontSize: 14, lineHeight: 1.55 }}>{desc}</span>
      <span style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
        {stat && <span style={{ color: OK }}>{stat}</span>}
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 500 }}>{enter} <ArrowRight size={14} /></span>
      </span>
    </Link>
  );
}

export default function StartPage() {
  const t = useT("nis2");
  const [profile] = useNis2Profile();
  const nis2 = useNis2All(profile);
  const reqs = profile ? NIS2_SETS[profile].requirements : [];
  const [systems] = useState<number>(() => (typeof window === "undefined" ? 0 : loadInventory().length));
  const done = reqs.filter((r) => nis2[r.id]?.status === "done").length;

  return (
    <div style={{ maxWidth: 900, margin: "40px auto 0", color: INK }}>
      <h1 style={{ margin: 0 }}>{t("start_title")}</h1>
      <p style={{ fontSize: 14, margin: "8px 0 28px", lineHeight: 1.5 }}>{t("start_sub")}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <AreaCard href="/dashboard" icon={<ShieldCheck size={22} />} name={t("aiact_name")} law={t("aiact_law")} desc={t("aiact_desc")}
          stat={systems ? `${systems} ${t(systems === 1 ? "system_one" : "system_many")}` : undefined} enter={t("enter")} />
        <AreaCard href="/dashboard/nis2" icon={<Network size={22} />} name={t("nis2_name")} law={t("nis2_law")} desc={t("nis2_desc")}
          stat={profile ? `${t(`profile_${profile}`)} · ${done}/${reqs.length} ${t("done_of")}` : undefined} enter={t("enter")} />
      </div>
    </div>
  );
}
