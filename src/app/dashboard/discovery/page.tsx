"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Search,
  GitBranch,
  Upload,
  Package,
  Cloud,
  Cpu,
  X,
  Eye,
  EyeOff,
  ChevronRight,
  CheckCircle,
  RefreshCw,
  Trash2,
  ArrowRight,
  Info,
  Loader,
} from "lucide-react";
import {
  SOURCE_CATALOG,
  SourceType,
  DiscoverySource,
  DiscoveredSystem,
  simulateScan,
  loadDiscoverySources,
  saveDiscoverySources,
  loadDiscoveredSystems,
  saveDiscoveredSystems,
} from "@/lib/simulation/discovery-engine";
import { writeToStorage, STORAGE_KEYS } from "@/lib/dossier/storage-schema";

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid rgba(0,0,0,0.07)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  borderRadius: "12px",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function getSourceIcon(type: SourceType): React.ElementType {
  switch (type) {
    case "github_repo":
      return GitBranch;
    case "file_upload":
      return Upload;
    case "npm_package":
      return Package;
    case "aws_sagemaker":
    case "azure_ml":
      return Cloud;
    case "huggingface":
      return Cpu;
    default:
      return Search;
  }
}

function getRiskMeta(risk: string): {
  label: string;
  bg: string;
  color: string;
  border: string;
} {
  if (risk === "Unacceptable")
    return {
      label: "⚠️ Pratica vietata?",
      bg: "rgba(220,38,38,0.07)",
      color: "#b91c1c",
      border: "rgba(220,38,38,0.2)",
    };
  if (risk === "High")
    return {
      label: "🔴 Alto rischio",
      bg: "rgba(234,88,12,0.07)",
      color: "#c2410c",
      border: "rgba(234,88,12,0.2)",
    };
  if (risk === "Limited")
    return {
      label: "🟡 Rischio limitato",
      bg: "rgba(202,138,4,0.07)",
      color: "#a16207",
      border: "rgba(202,138,4,0.2)",
    };
  return {
    label: "🟢 Rischio minimo",
    bg: "rgba(22,163,74,0.07)",
    color: "#15803d",
    border: "rgba(22,163,74,0.2)",
  };
}

function getSeverityColor(sev: string): string {
  if (sev === "critical") return "#dc2626";
  if (sev === "high") return "#ea580c";
  if (sev === "medium") return "#d97706";
  return "#6b7280";
}

function inferArticles(risk: string): string[] {
  if (risk === "Unacceptable") return ["Art. 5"];
  if (risk === "High")
    return [
      "Art. 9",
      "Art. 10",
      "Art. 11",
      "Art. 12",
      "Art. 13",
      "Art. 14",
      "Art. 15",
      "Art. 17",
    ];
  if (risk === "Limited") return ["Art. 13", "Art. 52"];
  return ["Art. 6"];
}

const RISK_ORDER: Record<string, number> = {
  Unacceptable: 0,
  High: 1,
  Limited: 2,
  Minimal: 3,
};

function StatusDot({ status }: { status: DiscoveredSystem["status"] }) {
  const colors: Record<DiscoveredSystem["status"], string> = {
    new: "#3b82f6",
    under_review: "#d97706",
    classified: "#15803d",
    ignored: "#9ca3af",
  };
  return (
    <span
      style={{
        display: "inline-block",
        width: "7px",
        height: "7px",
        borderRadius: "50%",
        background: colors[status],
        flexShrink: 0,
      }}
    />
  );
}

export default function DiscoveryPage() {
  const [sources, setSources] = useState<DiscoverySource[]>([]);
  const [systems, setSystems] = useState<DiscoveredSystem[]>([]);
  const [activeTab, setActiveTab] = useState<
    "sources" | "discovered" | "compliance"
  >("sources");
  const [showAddSource, setShowAddSource] = useState(false);
  const [selectedSourceType, setSelectedSourceType] =
    useState<SourceType | null>(null);
  const [sourceForm, setSourceForm] = useState<Record<string, string>>({});
  const [uploadedFileContent, setUploadedFileContent] = useState<string>("");
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState<string>("");
  const [selectedSystem, setSelectedSystem] =
    useState<DiscoveredSystem | null>(null);
  const [systemFilter, setSystemFilter] = useState<
    "all" | "new" | "under_review" | "classified" | "ignored"
  >("all");
  const [toast, setToast] = useState<string | null>(null);
  const [revealedFields, setRevealedFields] = useState<
    Record<string, boolean>
  >({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSources(loadDiscoverySources());
    setSystems(loadDiscoveredSystems());
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleAddSource() {
    if (!selectedSourceType) return;
    const catalog = SOURCE_CATALOG.find((c) => c.type === selectedSourceType)!;
    const newSource: DiscoverySource = {
      id: `src-${Date.now()}`,
      type: selectedSourceType,
      label:
        sourceForm.url ||
        sourceForm.orgOrUser ||
        sourceForm.workspace ||
        catalog.name,
      config:
        selectedSourceType === "file_upload"
          ? { fileContent: uploadedFileContent }
          : { ...sourceForm },
      status: "idle",
    };
    const updated = [...sources, newSource];
    setSources(updated);
    saveDiscoverySources(updated);
    setShowAddSource(false);
    setSelectedSourceType(null);
    setSourceForm({});
    setUploadedFileContent("");
    showToast("Sorgente aggiunta");
  }

  function handleRemoveSource(id: string) {
    const updated = sources.filter((s) => s.id !== id);
    setSources(updated);
    saveDiscoverySources(updated);
  }

  async function handleScan(sourceId: string) {
    setScanningId(sourceId);
    setSources((prev) => {
      const updated = prev.map((s) =>
        s.id === sourceId ? { ...s, status: "scanning" as const } : s
      );
      saveDiscoverySources(updated);
      return updated;
    });

    const steps = [
      "Connessione alla sorgente...",
      "Analisi dipendenze...",
      "Rilevamento librerie AI...",
      "Classificazione AI Act...",
    ];
    for (const msg of steps) {
      setScanMessage(msg);
      await new Promise<void>((r) =>
        setTimeout(r, 400 + Math.random() * 300)
      );
    }

    const source = sources.find((s) => s.id === sourceId)!;
    const discovered = simulateScan(source);

    setSystems((prev) => {
      const existingNames = new Set(prev.map((s) => s.name));
      const newSystems = discovered.filter((d) => !existingNames.has(d.name));
      const updated = [...prev, ...newSystems];
      saveDiscoveredSystems(updated);
      return updated;
    });

    setSources((prev) => {
      const updated = prev.map((s) =>
        s.id === sourceId
          ? { ...s, status: "done" as const, lastScannedAt: new Date().toISOString() }
          : s
      );
      saveDiscoverySources(updated);
      return updated;
    });

    setScanningId(null);
    setScanMessage("");

    if (discovered.length > 0) {
      setActiveTab("discovered");
      showToast(
        `${discovered.length} sistem${discovered.length === 1 ? "a" : "i"} rilevat${discovered.length === 1 ? "o" : "i"}`
      );
    } else {
      showToast("Scansione completata — nessun sistema AI rilevato");
    }
  }

  function handleAddToCompliance(system: DiscoveredSystem) {
    writeToStorage("classifier", {
      systemName: system.name,
      systemDescription: system.description,
      riskLevel: system.inferredRiskLevel.toLowerCase() as
        | "unacceptable"
        | "high"
        | "limited"
        | "minimal",
      annexIII: system.inferredAnnexCategory !== null,
      applicableArticles: inferArticles(system.inferredRiskLevel),
      completedAt: new Date().toISOString(),
    });

    setSystems((prev) => {
      const updated = prev.map((s) =>
        s.id === system.id
          ? { ...s, status: "classified" as const, addedToCompliance: true }
          : s
      );
      saveDiscoveredSystems(updated);
      if (selectedSystem?.id === system.id) {
        setSelectedSystem({
          ...system,
          status: "classified",
          addedToCompliance: true,
        });
      }
      return updated;
    });

    showToast(`✓ ${system.name} avviato nel percorso di compliance`);
  }

  function handleIgnoreSystem(system: DiscoveredSystem) {
    setSystems((prev) => {
      const updated = prev.map((s) =>
        s.id === system.id ? { ...s, status: "ignored" as const } : s
      );
      saveDiscoveredSystems(updated);
      return updated;
    });
    if (selectedSystem?.id === system.id) setSelectedSystem(null);
  }

  function handleMarkReview(system: DiscoveredSystem) {
    setSystems((prev) => {
      const updated = prev.map((s) =>
        s.id === system.id ? { ...s, status: "under_review" as const } : s
      );
      saveDiscoveredSystems(updated);
      return updated;
    });
    if (selectedSystem?.id === system.id) {
      setSelectedSystem({ ...system, status: "under_review" });
    }
  }

  const selectedCatalog = selectedSourceType
    ? SOURCE_CATALOG.find((c) => c.type === selectedSourceType)
    : null;

  function renderAddSourceDrawer() {
    if (!selectedCatalog || !selectedSourceType) return null;
    return (
      <>
        {/* Backdrop */}
        <div
          onClick={() => {
            setShowAddSource(false);
            setSelectedSourceType(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 40,
          }}
        />
        {/* Panel */}
        <div
          style={{
            position: "fixed",
            right: 0,
            top: 0,
            height: "100%",
            width: "100%",
            maxWidth: "420px",
            background: "#ffffff",
            boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
            zIndex: 50,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px 24px",
              borderBottom: "1px solid rgba(0,0,0,0.07)",
              flexShrink: 0,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "11px",
                  color: "rgba(0,0,0,0.42)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "2px",
                }}
              >
                Connetti sorgente
              </p>
              <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#0D1016" }}>
                {selectedCatalog.name}
              </h2>
            </div>
            <button
              onClick={() => {
                setShowAddSource(false);
                setSelectedSourceType(null);
              }}
              style={{
                padding: "6px",
                borderRadius: "8px",
                border: "none",
                background: "rgba(0,0,0,0.05)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={16} color="rgba(0,0,0,0.5)" />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: "24px", flex: 1 }}>
            <p
              style={{
                fontSize: "12px",
                color: "rgba(0,0,0,0.5)",
                marginBottom: "20px",
                lineHeight: 1.5,
              }}
            >
              {selectedCatalog.description}
            </p>

            {selectedSourceType === "file_upload" ? (
              <div>
                {/* Drop zone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) =>
                        setUploadedFileContent(
                          (ev.target?.result as string) || ""
                        );
                      reader.readAsText(file);
                    }
                  }}
                  style={{
                    border: "2px dashed rgba(59,130,246,0.3)",
                    borderRadius: "12px",
                    padding: "32px 24px",
                    textAlign: "center",
                    marginBottom: "16px",
                    background: "rgba(59,130,246,0.02)",
                    cursor: "pointer",
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload
                    size={28}
                    color="rgba(0,0,0,0.25)"
                    style={{ margin: "0 auto 8px" }}
                  />
                  <p
                    style={{
                      fontSize: "12px",
                      color: "rgba(0,0,0,0.5)",
                      marginBottom: "8px",
                    }}
                  >
                    Trascina qui{" "}
                    <code style={{ fontSize: "11px" }}>requirements.txt</code>{" "}
                    o <code style={{ fontSize: "11px" }}>package.json</code>
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    style={{
                      fontSize: "11px",
                      color: "#3b82f6",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    Scegli file
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.json"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) =>
                          setUploadedFileContent(
                            (ev.target?.result as string) || ""
                          );
                        reader.readAsText(file);
                      }
                    }}
                  />
                </div>
                <p
                  style={{
                    fontSize: "11px",
                    color: "rgba(0,0,0,0.42)",
                    marginBottom: "6px",
                  }}
                >
                  ...oppure incolla il contenuto:
                </p>
                <textarea
                  value={uploadedFileContent}
                  onChange={(e) => setUploadedFileContent(e.target.value)}
                  rows={6}
                  placeholder={"# requirements.txt\nopencv-python==4.8.0\ntransformers==4.35.0\n..."}
                  style={{
                    width: "100%",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    border: "1px solid rgba(0,0,0,0.12)",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    resize: "vertical",
                    outline: "none",
                    color: "#0D1016",
                    boxSizing: "border-box",
                  }}
                />
                {uploadedFileContent && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#15803d",
                      marginTop: "6px",
                    }}
                  >
                    ✓ Contenuto caricato ({uploadedFileContent.length}{" "}
                    caratteri)
                  </p>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {selectedCatalog.configFields.map((field) => (
                  <div key={field.key}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "11px",
                        fontWeight: 500,
                        color: "rgba(0,0,0,0.6)",
                        marginBottom: "6px",
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {field.label}
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={
                          field.secret && !revealedFields[field.key]
                            ? "password"
                            : "text"
                        }
                        value={sourceForm[field.key] || ""}
                        onChange={(e) =>
                          setSourceForm((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        placeholder={field.placeholder}
                        style={{
                          width: "100%",
                          fontSize: "13px",
                          border: "1px solid rgba(0,0,0,0.12)",
                          borderRadius: "8px",
                          padding: field.secret
                            ? "10px 36px 10px 12px"
                            : "10px 12px",
                          outline: "none",
                          color: "#0D1016",
                          boxSizing: "border-box",
                          background: "#fafaf9",
                        }}
                      />
                      {field.secret && (
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedFields((prev) => ({
                              ...prev,
                              [field.key]: !prev[field.key],
                            }))
                          }
                          style={{
                            position: "absolute",
                            right: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "2px",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {revealedFields[field.key] ? (
                            <EyeOff size={14} color="rgba(0,0,0,0.4)" />
                          ) : (
                            <Eye size={14} color="rgba(0,0,0,0.4)" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid rgba(0,0,0,0.07)",
              flexShrink: 0,
              display: "flex",
              gap: "8px",
            }}
          >
            <button
              onClick={() => {
                setShowAddSource(false);
                setSelectedSourceType(null);
              }}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(0,0,0,0.12)",
                background: "#ffffff",
                fontSize: "13px",
                color: "rgba(0,0,0,0.6)",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Annulla
            </button>
            <button
              onClick={handleAddSource}
              style={{
                flex: 2,
                padding: "10px 16px",
                borderRadius: "8px",
                border: "none",
                background: "#3b82f6",
                fontSize: "13px",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Salva sorgente
            </button>
          </div>
        </div>
      </>
    );
  }

  function renderSourcesTab() {
    return (
      <div>
        {/* Source catalog grid */}
        <p
          style={{
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "rgba(0,0,0,0.42)",
            marginBottom: "12px",
            fontWeight: 500,
          }}
        >
          Sorgenti disponibili
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "12px",
            marginBottom: "32px",
          }}
        >
          {SOURCE_CATALOG.map((catalog) => {
            const Icon = getSourceIcon(catalog.type);
            const isConnected = sources.some((s) => s.type === catalog.type);
            return (
              <div
                key={catalog.type}
                style={{
                  ...cardStyle,
                  padding: "16px",
                  borderLeft: isConnected
                    ? "3px solid #15803d"
                    : "1px solid rgba(0,0,0,0.07)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      borderRadius: "8px",
                      padding: "8px",
                      background: "rgba(59,130,246,0.08)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Icon size={16} color="#3b82f6" />
                  </div>
                  {isConnected && (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 500,
                        color: "#15803d",
                        background: "rgba(22,163,74,0.1)",
                        borderRadius: "20px",
                        padding: "2px 8px",
                      }}
                    >
                      ✓ Connessa
                    </span>
                  )}
                </div>
                <h3
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#0D1016",
                    marginBottom: "4px",
                  }}
                >
                  {catalog.name}
                </h3>
                <p
                  style={{
                    fontSize: "11px",
                    color: "rgba(0,0,0,0.42)",
                    lineHeight: 1.5,
                    marginBottom: "12px",
                  }}
                >
                  {catalog.description}
                </p>
                <button
                  onClick={() => {
                    setSelectedSourceType(catalog.type);
                    setShowAddSource(true);
                    setSourceForm({});
                    setUploadedFileContent("");
                  }}
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "#3b82f6",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {isConnected ? "Aggiungi altra →" : "Connetti →"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Connected sources */}
        {sources.length > 0 && (
          <div>
            <p
              style={{
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "rgba(0,0,0,0.42)",
                marginBottom: "12px",
                fontWeight: 500,
              }}
            >
              Sorgenti connesse ({sources.length})
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {sources.map((source) => {
                const Icon = getSourceIcon(source.type);
                const isScanning = scanningId === source.id;
                return (
                  <div key={source.id} style={{ ...cardStyle, padding: "16px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <Icon size={16} color="rgba(0,0,0,0.4)" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 500,
                              color: "#0D1016",
                            }}
                          >
                            {source.label}
                          </span>
                          {/* Status badge */}
                          {source.status === "done" && (
                            <span
                              style={{
                                fontSize: "10px",
                                color: "#15803d",
                                background: "rgba(22,163,74,0.1)",
                                borderRadius: "20px",
                                padding: "1px 7px",
                              }}
                            >
                              ✓ Scansionata
                            </span>
                          )}
                          {source.status === "error" && (
                            <span
                              style={{
                                fontSize: "10px",
                                color: "#dc2626",
                                background: "rgba(220,38,38,0.08)",
                                borderRadius: "20px",
                                padding: "1px 7px",
                              }}
                            >
                              Errore
                            </span>
                          )}
                          {isScanning && (
                            <span
                              style={{
                                fontSize: "10px",
                                color: "#3b82f6",
                                background: "rgba(59,130,246,0.08)",
                                borderRadius: "20px",
                                padding: "1px 7px",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Loader size={9} />
                              Scansione in corso
                            </span>
                          )}
                        </div>
                        <p
                          style={{
                            fontSize: "11px",
                            color: "rgba(0,0,0,0.42)",
                            marginTop: "2px",
                          }}
                        >
                          {source.lastScannedAt
                            ? `Ultima scansione: ${formatDate(source.lastScannedAt)}`
                            : "Mai scansionata"}
                        </p>
                        {isScanning && scanMessage && (
                          <p
                            style={{
                              fontSize: "11px",
                              color: "#3b82f6",
                              marginTop: "2px",
                            }}
                          >
                            {scanMessage}
                          </p>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                        <button
                          onClick={() => handleScan(source.id)}
                          disabled={isScanning || scanningId !== null}
                          style={{
                            fontSize: "11px",
                            fontWeight: 500,
                            color:
                              isScanning || scanningId !== null
                                ? "rgba(59,130,246,0.4)"
                                : "#3b82f6",
                            background: "rgba(59,130,246,0.07)",
                            border: "none",
                            borderRadius: "6px",
                            padding: "6px 10px",
                            cursor:
                              isScanning || scanningId !== null
                                ? "not-allowed"
                                : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {isScanning ? (
                            <Loader size={12} />
                          ) : (
                            <RefreshCw size={12} />
                          )}
                          Scansiona
                        </button>
                        <button
                          onClick={() => handleRemoveSource(source.id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "6px",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Trash2 size={14} color="rgba(0,0,0,0.3)" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showAddSource && selectedSourceType && renderAddSourceDrawer()}
      </div>
    );
  }

  function renderDiscoveredTab() {
    const filterLabels: Record<string, string> = {
      all: `Tutti (${systems.length})`,
      new: `Nuovi (${systems.filter((s) => s.status === "new").length})`,
      under_review: `In revisione (${systems.filter((s) => s.status === "under_review").length})`,
      classified: `Classificati (${systems.filter((s) => s.status === "classified").length})`,
      ignored: `Ignorati (${systems.filter((s) => s.status === "ignored").length})`,
    };

    const filteredSystems = systems
      .filter((s) => (systemFilter === "all" ? true : s.status === systemFilter))
      .sort(
        (a, b) =>
          (RISK_ORDER[a.inferredRiskLevel] ?? 3) -
          (RISK_ORDER[b.inferredRiskLevel] ?? 3)
      );

    return (
      <div>
        {/* Filter bar */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            marginBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          {(
            ["all", "new", "under_review", "classified", "ignored"] as const
          ).map((f) => (
            <button
              key={f}
              onClick={() => setSystemFilter(f)}
              style={{
                fontSize: "11px",
                borderRadius: "20px",
                padding: "4px 12px",
                border:
                  systemFilter === f
                    ? "1px solid rgba(59,130,246,0.4)"
                    : "1px solid rgba(0,0,0,0.1)",
                background:
                  systemFilter === f ? "rgba(59,130,246,0.08)" : "#ffffff",
                color: systemFilter === f ? "#3b82f6" : "rgba(0,0,0,0.5)",
                cursor: "pointer",
                fontWeight: systemFilter === f ? 500 : 400,
              }}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>

        {filteredSystems.length === 0 ? (
          <div
            style={{
              ...cardStyle,
              padding: "48px 32px",
              textAlign: "center",
            }}
          >
            <Search
              size={32}
              color="rgba(0,0,0,0.2)"
              style={{ margin: "0 auto 12px" }}
            />
            <p style={{ fontSize: "13px", color: "rgba(0,0,0,0.42)" }}>
              {systems.length === 0
                ? "Nessun sistema rilevato ancora."
                : "Nessun sistema con questo filtro."}
            </p>
            {systems.length === 0 && (
              <button
                onClick={() => setActiveTab("sources")}
                style={{
                  fontSize: "12px",
                  color: "#3b82f6",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  marginTop: "8px",
                }}
              >
                Aggiungi sorgente →
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            {/* Left column */}
            <div style={{ width: "280px", flexShrink: 0, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {filteredSystems.map((system) => {
                  const riskMeta = getRiskMeta(system.inferredRiskLevel);
                  const isSelected = selectedSystem?.id === system.id;
                  const source = sources.find((s) => s.id === system.sourceId);
                  const confidenceWidth =
                    system.confidence === "high"
                      ? "80%"
                      : system.confidence === "medium"
                        ? "55%"
                        : "30%";
                  return (
                    <button
                      key={system.id}
                      onClick={() => setSelectedSystem(system)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        borderRadius: "12px",
                        padding: "12px",
                        background: isSelected
                          ? "rgba(59,130,246,0.06)"
                          : "#ffffff",
                        border: isSelected
                          ? "1px solid rgba(59,130,246,0.3)"
                          : "1px solid rgba(0,0,0,0.07)",
                        cursor: "pointer",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          marginBottom: "4px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "10px",
                            borderRadius: "20px",
                            padding: "2px 7px",
                            background: riskMeta.bg,
                            color: riskMeta.color,
                          }}
                        >
                          {riskMeta.label}
                        </span>
                        <StatusDot status={system.status} />
                      </div>
                      <p
                        style={{
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "#0D1016",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginBottom: "2px",
                        }}
                      >
                        {system.name}
                      </p>
                      {system.inferredAnnexCategory && (
                        <p
                          style={{
                            fontSize: "10px",
                            color: "rgba(0,0,0,0.42)",
                          }}
                        >
                          Allegato III — {system.inferredAnnexCategory}
                        </p>
                      )}
                      <p
                        style={{
                          fontSize: "10px",
                          color: "rgba(0,0,0,0.42)",
                          marginTop: "4px",
                        }}
                      >
                        {source ? source.label : "sorgente sconosciuta"} ·{" "}
                        {formatDate(system.discoveredAt)}
                      </p>
                      {/* Confidence bar */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          marginTop: "6px",
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            height: "4px",
                            borderRadius: "9999px",
                            background: "rgba(0,0,0,0.07)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "4px",
                              borderRadius: "9999px",
                              background: riskMeta.color,
                              width: confidenceWidth,
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: "9px",
                            color: "rgba(0,0,0,0.42)",
                          }}
                        >
                          {system.confidence}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right column — detail */}
            <div style={{ flex: 1, minWidth: "280px" }}>
              {!selectedSystem ? (
                <div
                  style={{
                    ...cardStyle,
                    padding: "48px 32px",
                    textAlign: "center",
                  }}
                >
                  <Search
                    size={32}
                    color="rgba(0,0,0,0.15)"
                    style={{ margin: "0 auto 12px" }}
                  />
                  <p
                    style={{
                      fontSize: "13px",
                      color: "rgba(0,0,0,0.42)",
                    }}
                  >
                    Seleziona un sistema per vedere il dettaglio
                  </p>
                </div>
              ) : (
                (() => {
                  const riskMeta = getRiskMeta(
                    selectedSystem.inferredRiskLevel
                  );
                  return (
                    <div style={{ ...cardStyle, padding: "20px" }}>
                      {/* Header */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          marginBottom: "16px",
                        }}
                      >
                        <div>
                          <h2
                            style={{
                              fontSize: "16px",
                              fontWeight: 600,
                              color: "#0D1016",
                              marginBottom: "2px",
                            }}
                          >
                            {selectedSystem.name}
                          </h2>
                          <p
                            style={{
                              fontSize: "11px",
                              color: "rgba(0,0,0,0.42)",
                            }}
                          >
                            Scoperto {formatDate(selectedSystem.discoveredAt)}
                          </p>
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            borderRadius: "20px",
                            padding: "3px 10px",
                            background: riskMeta.bg,
                            color: riskMeta.color,
                            border: `1px solid ${riskMeta.border}`,
                          }}
                        >
                          {riskMeta.label}
                        </span>
                      </div>

                      {/* Risk section */}
                      <div
                        style={{
                          borderRadius: "10px",
                          padding: "12px",
                          marginBottom: "16px",
                          background: riskMeta.bg,
                          border: `1px solid ${riskMeta.border}`,
                        }}
                      >
                        <p
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            color: "rgba(0,0,0,0.42)",
                            letterSpacing: "0.05em",
                            marginBottom: "4px",
                          }}
                        >
                          Livello di rischio inferito
                        </p>
                        <p
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: riskMeta.color,
                          }}
                        >
                          {riskMeta.label}
                        </p>
                        {selectedSystem.inferredAnnexCategory && (
                          <p
                            style={{
                              fontSize: "11px",
                              color: "rgba(0,0,0,0.42)",
                              marginTop: "2px",
                            }}
                          >
                            Categoria: {selectedSystem.inferredAnnexCategory}
                          </p>
                        )}
                      </div>

                      {/* Description */}
                      <div style={{ marginBottom: "16px" }}>
                        <p
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            color: "rgba(0,0,0,0.42)",
                            letterSpacing: "0.05em",
                            marginBottom: "6px",
                          }}
                        >
                          Descrizione
                        </p>
                        <p
                          style={{
                            fontSize: "12px",
                            lineHeight: 1.6,
                            color: "rgba(0,0,0,0.7)",
                          }}
                        >
                          {selectedSystem.description}
                        </p>
                      </div>

                      {/* Evidence */}
                      <div style={{ marginBottom: "16px" }}>
                        <p
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            color: "rgba(0,0,0,0.42)",
                            letterSpacing: "0.05em",
                            marginBottom: "8px",
                          }}
                        >
                          Evidenze rilevate
                        </p>
                        <ul
                          style={{
                            listStyle: "none",
                            padding: 0,
                            margin: 0,
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                          }}
                        >
                          {selectedSystem.evidence.map((e, i) => (
                            <li
                              key={i}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "8px",
                                fontSize: "11px",
                                color: "rgba(0,0,0,0.5)",
                              }}
                            >
                              <span
                                style={{
                                  flexShrink: 0,
                                  fontSize: "10px",
                                  color: "rgba(0,0,0,0.3)",
                                  marginTop: "1px",
                                }}
                              >
                                →
                              </span>
                              {e}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Libraries table */}
                      {selectedSystem.detectedLibraries.length > 0 && (
                        <div style={{ marginBottom: "16px" }}>
                          <p
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              color: "rgba(0,0,0,0.42)",
                              letterSpacing: "0.05em",
                              marginBottom: "8px",
                            }}
                          >
                            Librerie rilevate
                          </p>
                          <div
                            style={{
                              borderRadius: "8px",
                              overflow: "hidden",
                              border: "1px solid rgba(0,0,0,0.08)",
                            }}
                          >
                            <table
                              style={{
                                width: "100%",
                                fontSize: "11px",
                                borderCollapse: "collapse",
                              }}
                            >
                              <thead>
                                <tr
                                  style={{
                                    background: "#fafaf9",
                                    borderBottom: "1px solid rgba(0,0,0,0.07)",
                                  }}
                                >
                                  <th
                                    style={{
                                      textAlign: "left",
                                      padding: "8px 12px",
                                      fontWeight: 500,
                                      color: "rgba(0,0,0,0.5)",
                                    }}
                                  >
                                    Libreria
                                  </th>
                                  <th
                                    style={{
                                      textAlign: "left",
                                      padding: "8px 12px",
                                      fontWeight: 500,
                                      color: "rgba(0,0,0,0.5)",
                                    }}
                                  >
                                    Versione
                                  </th>
                                  <th
                                    style={{
                                      textAlign: "left",
                                      padding: "8px 12px",
                                      fontWeight: 500,
                                      color: "rgba(0,0,0,0.5)",
                                    }}
                                  >
                                    Severità
                                  </th>
                                  <th
                                    style={{
                                      textAlign: "left",
                                      padding: "8px 12px",
                                      fontWeight: 500,
                                      color: "rgba(0,0,0,0.5)",
                                    }}
                                  >
                                    Categoria
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedSystem.detectedLibraries.map(
                                  (lib, i) => (
                                    <tr
                                      key={i}
                                      style={{
                                        borderBottom:
                                          i <
                                          selectedSystem.detectedLibraries
                                            .length -
                                            1
                                            ? "1px solid rgba(0,0,0,0.05)"
                                            : "none",
                                      }}
                                    >
                                      <td
                                        style={{
                                          padding: "8px 12px",
                                          fontWeight: 500,
                                          color: "#0D1016",
                                        }}
                                      >
                                        {lib.name}
                                      </td>
                                      <td
                                        style={{
                                          padding: "8px 12px",
                                          color: "rgba(0,0,0,0.42)",
                                        }}
                                      >
                                        {lib.version}
                                      </td>
                                      <td style={{ padding: "8px 12px" }}>
                                        <span
                                          style={{
                                            fontSize: "10px",
                                            borderRadius: "20px",
                                            padding: "2px 7px",
                                            color: getSeverityColor(
                                              lib.severity
                                            ),
                                            background: `${getSeverityColor(lib.severity)}18`,
                                          }}
                                        >
                                          {lib.severity}
                                        </span>
                                      </td>
                                      <td
                                        style={{
                                          padding: "8px 12px",
                                          color: "rgba(0,0,0,0.42)",
                                          fontSize: "10px",
                                        }}
                                      >
                                        {lib.annexCategory || "—"}
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Confidence note */}
                      <div
                        style={{
                          borderRadius: "8px",
                          padding: "12px",
                          marginBottom: "16px",
                          background: "#fafaf9",
                          border: "1px solid rgba(0,0,0,0.07)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            marginBottom: "4px",
                          }}
                        >
                          <Info size={12} color="rgba(0,0,0,0.4)" />
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 500,
                              color: "#0D1016",
                            }}
                          >
                            Confidenza classificazione:{" "}
                            {selectedSystem.confidence === "high"
                              ? "Alta"
                              : selectedSystem.confidence === "medium"
                                ? "Media"
                                : "Bassa"}
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: "11px",
                            color: "rgba(0,0,0,0.42)",
                          }}
                        >
                          Basata su nome endpoint + framework + tipo di input.
                          Verifica manuale raccomandata prima di procedere.
                        </p>
                      </div>

                      {/* Actions */}
                      {!selectedSystem.addedToCompliance ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            onClick={() => handleIgnoreSystem(selectedSystem)}
                            style={{
                              fontSize: "12px",
                              padding: "8px 14px",
                              borderRadius: "8px",
                              border: "1px solid rgba(0,0,0,0.12)",
                              background: "#ffffff",
                              color: "rgba(0,0,0,0.6)",
                              cursor: "pointer",
                              fontWeight: 500,
                            }}
                          >
                            Ignora sistema
                          </button>
                          <button
                            onClick={() => handleMarkReview(selectedSystem)}
                            style={{
                              fontSize: "12px",
                              padding: "8px 14px",
                              borderRadius: "8px",
                              border: "1px solid rgba(0,0,0,0.12)",
                              background: "#ffffff",
                              color: "rgba(0,0,0,0.6)",
                              cursor: "pointer",
                              fontWeight: 500,
                            }}
                          >
                            Segna come revisionato
                          </button>
                          <button
                            onClick={() =>
                              handleAddToCompliance(selectedSystem)
                            }
                            style={{
                              fontSize: "12px",
                              padding: "8px 14px",
                              borderRadius: "8px",
                              border: "none",
                              background: "#3b82f6",
                              color: "#ffffff",
                              cursor: "pointer",
                              fontWeight: 500,
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            Avvia compliance
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            borderRadius: "10px",
                            padding: "12px",
                            background: "rgba(22,163,74,0.07)",
                            border: "1px solid rgba(22,163,74,0.2)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              marginBottom: "8px",
                            }}
                          >
                            <CheckCircle size={14} color="#15803d" />
                            <p
                              style={{
                                fontSize: "12px",
                                fontWeight: 500,
                                color: "#15803d",
                              }}
                            >
                              Avviato nel percorso di compliance
                            </p>
                          </div>
                          <Link
                            href="/dashboard/tools/classifier"
                            style={{
                              fontSize: "11px",
                              color: "#3b82f6",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              textDecoration: "none",
                            }}
                          >
                            Vai al Classifier
                            <ChevronRight size={11} />
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderComplianceTab() {
    const complianceSystems = systems.filter((s) => s.addedToCompliance);

    const tools: Array<{ label: string; storageKey: string }> = [
      { label: "Classifier", storageKey: STORAGE_KEYS.classifier },
      { label: "Risk Manager", storageKey: STORAGE_KEYS.riskManager },
      { label: "Data Audit", storageKey: STORAGE_KEYS.dataAudit },
      { label: "DocuGen", storageKey: STORAGE_KEYS.docugen },
      { label: "LogVault", storageKey: STORAGE_KEYS.logvault },
      { label: "Transparency", storageKey: STORAGE_KEYS.transparency },
      { label: "Oversight", storageKey: STORAGE_KEYS.oversight },
      { label: "Resilience", storageKey: STORAGE_KEYS.resilience },
      { label: "QMS", storageKey: STORAGE_KEYS.qms },
    ];

    if (complianceSystems.length === 0) {
      return (
        <div
          style={{
            ...cardStyle,
            padding: "48px 32px",
            textAlign: "center",
          }}
        >
          <CheckCircle
            size={32}
            color="rgba(0,0,0,0.15)"
            style={{ margin: "0 auto 12px" }}
          />
          <p style={{ fontSize: "13px", color: "rgba(0,0,0,0.42)" }}>
            Nessun sistema avviato in compliance.
          </p>
          <button
            onClick={() => setActiveTab("discovered")}
            style={{
              fontSize: "12px",
              color: "#3b82f6",
              background: "none",
              border: "none",
              cursor: "pointer",
              marginTop: "8px",
            }}
          >
            Vai a &quot;Sistemi rilevati&quot; per classificarne uno →
          </button>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {complianceSystems.map((system) => {
          const riskMeta = getRiskMeta(system.inferredRiskLevel);
          return (
            <div key={system.id} style={{ ...cardStyle, padding: "16px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "4px",
                    }}
                  >
                    <CheckCircle size={14} color="#15803d" />
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#0D1016",
                      }}
                    >
                      {system.name}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        borderRadius: "4px",
                        padding: "1px 6px",
                        background: riskMeta.bg,
                        color: riskMeta.color,
                      }}
                    >
                      {riskMeta.label}
                    </span>
                    {system.inferredAnnexCategory && (
                      <span
                        style={{
                          fontSize: "10px",
                          color: "rgba(0,0,0,0.42)",
                        }}
                      >
                        · Allegato III pt.{" "}
                        {system.inferredAnnexCategory.split(".")[0]}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href="/dashboard/dossier"
                  style={{
                    fontSize: "11px",
                    color: "#3b82f6",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    textDecoration: "none",
                    flexShrink: 0,
                  }}
                >
                  Apri dossier
                  <ArrowRight size={11} />
                </Link>
              </div>

              <p
                style={{
                  fontSize: "11px",
                  color: "rgba(0,0,0,0.42)",
                  marginBottom: "8px",
                }}
              >
                Tool da completare:
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {tools.map((tool) => {
                  const done =
                    typeof window !== "undefined" &&
                    !!localStorage.getItem(tool.storageKey);
                  return (
                    <span
                      key={tool.label}
                      style={{
                        fontSize: "10px",
                        borderRadius: "20px",
                        padding: "3px 9px",
                        background: done
                          ? "rgba(22,163,74,0.1)"
                          : "rgba(0,0,0,0.04)",
                        color: done ? "#15803d" : "rgba(0,0,0,0.42)",
                        border: done
                          ? "1px solid rgba(22,163,74,0.2)"
                          : "1px solid rgba(0,0,0,0.07)",
                        fontWeight: done ? 500 : 400,
                      }}
                    >
                      {done ? "✓" : "○"} {tool.label}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const tabs = [
    { key: "sources" as const, label: "Sorgenti connesse" },
    {
      key: "discovered" as const,
      label: `Sistemi rilevati (${systems.length})`,
    },
    {
      key: "compliance" as const,
      label: `In compliance (${systems.filter((s) => s.addedToCompliance).length})`,
    },
  ];

  return (
    <div style={{ maxWidth: "900px" }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            background: "#0D1016",
            color: "#ffffff",
            fontSize: "13px",
            padding: "10px 16px",
            borderRadius: "10px",
            zIndex: 100,
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
            maxWidth: "320px",
          }}
        >
          {toast}
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "4px",
          }}
        >
          <Search size={14} color="#3b82f6" />
          <span
            style={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "rgba(0,0,0,0.42)",
              fontWeight: 500,
            }}
          >
            AI System Discovery
          </span>
          <span
            style={{
              fontSize: "10px",
              background: "rgba(59,130,246,0.1)",
              color: "#3b82f6",
              borderRadius: "20px",
              padding: "1px 7px",
              fontWeight: 500,
            }}
          >
            Art. 27
          </span>
        </div>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 600,
            color: "#0D1016",
            letterSpacing: "-0.5px",
            marginBottom: "6px",
          }}
        >
          AI System Discovery
        </h1>
        <p style={{ fontSize: "12px", color: "rgba(0,0,0,0.42)", lineHeight: 1.5 }}>
          Scopri automaticamente i sistemi AI della tua organizzazione e avviali
          nel percorso di compliance.
        </p>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginTop: "12px",
            flexWrap: "wrap",
          }}
        >
          {[
            { value: sources.length, label: "sorgenti" },
            { value: systems.length, label: "sistemi rilevati" },
            {
              value: systems.filter((s) => s.addedToCompliance).length,
              label: "in compliance",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#0D1016",
                }}
              >
                {stat.value}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "rgba(0,0,0,0.42)",
                }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Info banner */}
      {systems.length === 0 && (
        <div
          style={{
            background: "rgba(59,130,246,0.06)",
            border: "1px solid rgba(59,130,246,0.2)",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
          }}
        >
          <Info size={14} color="#3b82f6" style={{ flexShrink: 0, marginTop: "1px" }} />
          <p style={{ fontSize: "12px", color: "#1d4ed8", lineHeight: 1.5 }}>
            Il 73% delle aziende non sa quanti sistemi AI ha in produzione.
            Connetti le tue sorgenti per un inventario automatico conforme
            all&apos;Art. 27 AI Act.
          </p>
        </div>
      )}

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: "2px",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          marginBottom: "20px",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              fontSize: "13px",
              fontWeight: activeTab === tab.key ? 500 : 400,
              color:
                activeTab === tab.key ? "#0D1016" : "rgba(0,0,0,0.42)",
              background: "none",
              border: "none",
              borderBottom:
                activeTab === tab.key
                  ? "2px solid #0D1016"
                  : "2px solid transparent",
              padding: "8px 14px",
              cursor: "pointer",
              marginBottom: "-1px",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "sources" && renderSourcesTab()}
      {activeTab === "discovered" && renderDiscoveredTab()}
      {activeTab === "compliance" && renderComplianceTab()}
    </div>
  );
}
