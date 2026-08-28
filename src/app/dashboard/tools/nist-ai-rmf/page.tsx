"use client";
import React, { useState } from "react";
import { Map, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { useT } from "@/i18n/LocaleProvider";

const FONT = "var(--font-inter, system-ui)";

type T = (key: string) => string;

function buildFunctions(t: T) {
  return [
  {
    id: "govern",
    code: "GOVERN",
    color: "#16a34a",
    bg: "rgba(22,163,74,0.06)",
    border: "rgba(22,163,74,0.15)",
    desc: t("govern_desc"),
    aiActRefs: [
      { art: "Art. 9", label: t("govern_ref1") },
      { art: "Art. 17", label: t("govern_ref2") },
      { art: "Art. 26", label: t("govern_ref3") },
      { art: "Art. 72", label: t("govern_ref4") },
    ],
    subcategories: [
      t("govern_sub1"),
      t("govern_sub2"),
      t("govern_sub3"),
      t("govern_sub4"),
      t("govern_sub5"),
      t("govern_sub6"),
    ],
  },
  {
    id: "map",
    code: "MAP",
    color: "#b45309",
    bg: "rgba(180,83,9,0.06)",
    border: "rgba(180,83,9,0.15)",
    desc: t("map_desc"),
    aiActRefs: [
      { art: "Art. 6–7", label: t("map_ref1") },
      { art: "Art. 10", label: t("map_ref2") },
      { art: "Art. 13", label: t("map_ref3") },
      { art: "Art. 5",  label: t("map_ref4") },
    ],
    subcategories: [
      t("map_sub1"),
      t("map_sub2"),
      t("map_sub3"),
      t("map_sub4"),
      t("map_sub5"),
    ],
  },
  {
    id: "measure",
    code: "MEASURE",
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.06)",
    border: "rgba(124,58,237,0.15)",
    desc: t("measure_desc"),
    aiActRefs: [
      { art: "Art. 9",  label: t("measure_ref1") },
      { art: "Art. 10", label: t("measure_ref2") },
      { art: "Art. 15", label: t("measure_ref3") },
      { art: "Art. 62", label: t("measure_ref4") },
    ],
    subcategories: [
      t("measure_sub1"),
      t("measure_sub2"),
      t("measure_sub3"),
      t("measure_sub4"),
    ],
  },
  {
    id: "manage",
    code: "MANAGE",
    color: "#0369a1",
    bg: "rgba(3,105,161,0.06)",
    border: "rgba(3,105,161,0.15)",
    desc: t("manage_desc"),
    aiActRefs: [
      { art: "Art. 9",  label: t("manage_ref1") },
      { art: "Art. 18", label: t("manage_ref2") },
      { art: "Art. 61", label: t("manage_ref3") },
      { art: "Art. 73", label: t("manage_ref4") },
    ],
    subcategories: [
      t("manage_sub1"),
      t("manage_sub2"),
      t("manage_sub3"),
      t("manage_sub4"),
    ],
  },
  ];
}

type NistFunction = ReturnType<typeof buildFunctions>[0];

function SectionHeader({ title, legalRef }: { title: string; legalRef: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "#0D1016", borderRadius: 6, padding: "11px 18px",
      margin: "20px 0 12px",
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", letterSpacing: "0.3px" }}>
        {title}
      </span>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 500, letterSpacing: "0.5px" }}>
        {legalRef}
      </span>
    </div>
  );
}

function FunctionCard({ fn }: { fn: NistFunction }) {
  const t = useT("toolNist");
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      border: `1px solid ${fn.border}`,
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 10,
    }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "flex-start", gap: 14,
          padding: "16px 18px", background: fn.bg, border: "none", cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 4,
          color: fn.color, background: `${fn.color}18`, border: `1px solid ${fn.border}`,
          letterSpacing: "0.8px", flexShrink: 0, marginTop: 1,
        }}>
          {fn.code}
        </span>
        <span style={{ flex: 1, fontSize: 12.5, color: "#0D1016", lineHeight: 1.5 }}>
          {fn.desc}
        </span>
        <span style={{ color: fn.color, flexShrink: 0, marginTop: 2 }}>
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </span>
      </button>

      {open && (
        <div style={{ padding: "14px 18px 18px", background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
            <tbody>
              {fn.aiActRefs.map((ref, i) => (
                <tr key={i} style={{ borderBottom: i < fn.aiActRefs.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                  <td style={{ padding: "7px 0", width: "28%", verticalAlign: "top" }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: fn.color,
                      background: `${fn.color}12`, padding: "2px 7px", borderRadius: 4,
                    }}>
                      {ref.art}
                    </span>
                  </td>
                  <td style={{ padding: "7px 0", fontSize: 12, color: "#0D1016", verticalAlign: "top" }}>
                    {ref.label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.4)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 8 }}>
            {t("subcategories_label")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {fn.subcategories.map((sub, i) => (
              <div key={i} style={{
                fontSize: 11.5, color: "rgba(0,0,0,0.65)", padding: "5px 10px",
                background: "rgba(0,0,0,0.02)", borderRadius: 5,
                borderLeft: `2px solid ${fn.border}`,
              }}>
                {sub}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NistAiRmfPage() {
  const t = useT("toolNist");
  const functions = buildFunctions(t);
  return (
    <div style={{ fontFamily: FONT, color: "#0D1016" }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.3)", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 4 }}>
          NIST AI RMF 1.0
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Map size={18} style={{ color: "#0D1016" }} />
          <h1 style={{ fontSize: 24, fontWeight: 500, color: "#0D1016", letterSpacing: "-0.8px", margin: 0 }}>
            NIST AI Risk Management Framework
          </h1>
        </div>
        <p style={{ fontSize: 12, color: "rgba(0,0,0,0.4)", margin: 0 }}>
          {t("subtitle")}
        </p>
      </div>

      <div style={{
        background: "#fff", borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "24px 28px",
      }}>
        <SectionHeader title={t("sec_overview")} legalRef="NIST AI RMF 1.0 · 2023" />

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
          <tbody>
            {[
              [t("row_framework"), "NIST AI Risk Management Framework (AI RMF) 1.0"],
              [t("row_issuedBy"), "National Institute of Standards and Technology (NIST)"],
              [t("row_pubDate"), t("row_pubDate_val")],
              [t("row_compat"), t("row_compat_val")],
              [t("row_structure"), t("row_structure_val")],
            ].map(([label, value], i, arr) => (
              <tr key={label} style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
                <td style={{ padding: "9px 0", width: "38%", verticalAlign: "top" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0D1016" }}>{label}</span>
                </td>
                <td style={{ padding: "9px 0", fontSize: 12.5, color: "rgba(0,0,0,0.7)" }}>
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <SectionHeader title={t("sec_coreFunctions")} legalRef="Reg. UE 2024/1689" />

        <p style={{ fontSize: 12, color: "rgba(0,0,0,0.5)", marginBottom: 16, lineHeight: 1.6 }}>
          {t("coreFunctions_intro")}
        </p>

        {functions.map((fn) => (
          <FunctionCard key={fn.id} fn={fn} />
        ))}

        <SectionHeader title={t("sec_notes")} legalRef={t("ref_info")} />

        <div style={{
          padding: "12px 16px", borderRadius: 8,
          background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.06)",
          fontSize: 12, color: "rgba(0,0,0,0.55)", lineHeight: 1.7,
        }}>
          {t("notes_body")}
          {" "}<a
            href="https://airc.nist.gov/RMF"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#0D1016", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}
          >
            {t("notes_link")} <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </div>
  );
}
