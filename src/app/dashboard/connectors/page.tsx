"use client";

import {
  GitBranch,
  Database,
  BookOpen,
  Plus,
  Link,
  Unlink,
  RefreshCw,
  Trash2,
  Activity,
  Zap,
  Radio,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  EyeOff,
  Copy,
  ArrowRight,
  Wifi,
  WifiOff,
  Timer,
  History,
  Bell,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import {
  Connector,
  ConnectorStatus,
  DataMapping,
  HandshakeResult,
  WebhookEvent,
  HeartbeatLog,
  ConnectorNotification,
  performHandshake,
  sendHeartbeat,
  createWebhookListener,
  createDataMapping,
  buildDeepLink,
  createPollingConfig,
  upsertRecord,
  createConnector,
  createAutoMapping,
  createFRIABridge,
  forceAsyncLink,
  mapFRIAToRiskEvidence,
  maskApiKey,
  getHttpErrorMessage,
  createNotification,
  getDeepLink,
  loadConnectors,
  saveConnectors,
  loadDataMappings,
  saveDataMappings,
  loadHeartbeatLogs,
  saveHeartbeatLogs,
  loadWebhookEvents,
  saveWebhookEvents,
  loadNotifications,
  saveNotifications,
} from "@/lib/simulation/connectors-engine";

// ─── STILI ────────────────────────────────────────────────────────────

function cls(...args: (string | false | undefined | null)[]) {
  return args.filter(Boolean).join(" ");
}

const statusConfig: Record<ConnectorStatus, { label: string; icon: typeof CheckCircle; className: string }> = {
  connected: { label: "Connesso", icon: CheckCircle, className: "bg-success/10 text-success border-success/30" },
  disconnected: { label: "Scollegato", icon: XCircle, className: "bg-muted text-muted-foreground border-border" },
  error: { label: "Errore", icon: AlertTriangle, className: "bg-danger/10 text-danger border-danger/30" },
  pending: { label: "In attesa", icon: Clock, className: "bg-warning/10 text-warning border-warning/30" },
};

// ─── TOOLS MAP ────────────────────────────────────────────────────────

const AVAILABLE_TOOLS = [
  { key: "risk-manager", label: "Risk Manager" },
  { key: "rights-simulator", label: "Rights Simulator (FRIA)" },
  { key: "classifier", label: "AI Act Classifier" },
  { key: "oversight", label: "Human Oversight" },
  { key: "transparency", label: "Transparency Log" },
  { key: "docugen", label: "DocuGen" },
  { key: "qms", label: "QMS" },
  { key: "logvault", label: "LogVault" },
  { key: "data-audit", label: "Data Audit" },
  { key: "resilience", label: "Resilience Test" },
];

// ─── PAGINA ───────────────────────────────────────────────────────────

export default function ConnectorsPage() {
  // State
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [mappings, setMappings] = useState<DataMapping[]>([]);
  const [heartbeatLogs, setHeartbeatLogs] = useState<HeartbeatLog[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [notifications, setNotifications] = useState<ConnectorNotification[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [handshakeResults, setHandshakeResults] = useState<Record<string, HandshakeResult>>({});
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    name: "",
    sourceTool: "risk-manager",
    destTool: "rights-simulator",
    sourceEndpoint: "",
    destEndpoint: "",
    apiKey: "",
  });

  // Load from localStorage on mount
  useEffect(() => {
    setConnectors(loadConnectors());
    setMappings(loadDataMappings());
    setHeartbeatLogs(loadHeartbeatLogs());
    setWebhookEvents(loadWebhookEvents());
    setNotifications(loadNotifications());
  }, []);

  // Persist
  const persistConnectors = useCallback((updated: Connector[]) => {
    setConnectors(updated);
    saveConnectors(updated);
  }, []);

  const addNotification = useCallback((connectorId: string, type: ConnectorNotification["type"], code: string, message: string) => {
    const n = createNotification(connectorId, type, code, message);
    setNotifications((prev) => {
      const updated = [n, ...prev].slice(0, 50);
      saveNotifications(updated);
      return updated;
    });
  }, []);

  // ─── ACTIONS ────────────────────────────────────────────────────

  function addConnector() {
    if (!form.name || !form.sourceEndpoint || !form.apiKey) return;
    const conn = createConnector(
      form.name,
      form.sourceTool,
      form.destTool,
      form.sourceEndpoint,
      form.destEndpoint || form.sourceEndpoint,
      form.apiKey
    );
    const updated = [conn, ...connectors];
    persistConnectors(updated);

    // Auto-genera il primo mapping (parent_id) → Mapping Attivi passa a 1
    const riskId = `risk-${Date.now()}`;
    const autoMap = createAutoMapping(
      conn.id,
      form.sourceTool,
      form.destTool,
      conn.deepLinkTemplate,
      riskId
    );
    setMappings((prev) => {
      const updatedMaps = [autoMap, ...prev];
      saveDataMappings(updatedMaps);
      return updatedMaps;
    });

    addNotification(conn.id, "success", "CONNECTOR_CREATED", `Connettore "${form.name}" creato. Mapping automatico attivato (${riskId} → parent).`);
    setForm({ name: "", sourceTool: "risk-manager", destTool: "rights-simulator", sourceEndpoint: "", destEndpoint: "", apiKey: "" });
    setShowForm(false);
  }

  function removeConnector(id: string) {
    persistConnectors(connectors.filter((c) => c.id !== id));
    setMappings((prev) => prev.filter((m) => m.connectorId !== id));
  }

  // Quick preset: FRIA → Risk Manager
  async function quickFRIABridge() {
    if (!form.apiKey) return;
    const bridge = createFRIABridge(form.apiKey);
    const updated = [bridge, ...connectors];
    persistConnectors(updated);

    // Auto-mapping con payload FRIA simulato
    const simId = `sim-${Date.now()}`;
    const autoMap = createAutoMapping(bridge.id, "rights-simulator", "risk-manager", bridge.deepLinkTemplate, simId);
    setMappings((prev) => {
      const updatedMaps = [autoMap, ...prev];
      saveDataMappings(updatedMaps);
      return updatedMaps;
    });

    // Forza il linking asincrono
    const bridgePayload = {
      simulationId: simId,
      systemName: "Sistema AI (Bridge)",
      frasScore: 0.65,
      overallRating: "high",
      affectedRights: ["dignity", "non-discrimination"],
      agenticViolation: false,
      oversightComplete: true,
      status: "completed" as const,
      completedAt: new Date().toISOString(),
    };

    const result = await forceAsyncLink(
      bridge.destEndpoint,
      bridge.apiKey,
      bridgePayload,
      bridge.timeoutMs
    );

    addNotification(bridge.id, result.success ? "success" : "error", `BRIDGE_${result.action.toUpperCase()}`, result.message);

    // Aggiorna handshake result con l'esito del bridge
    setHandshakeResults((prev) => ({
      ...prev,
      [bridge.id]: {
        success: result.success,
        statusCode: result.action === "async_queued" ? 408 : result.success ? 200 : 502,
        message: result.message,
        timestamp: result.timestamp,
      },
    }));

    setForm({ name: "", sourceTool: "risk-manager", destTool: "rights-simulator", sourceEndpoint: "", destEndpoint: "", apiKey: "" });
    setShowForm(false);
  }

  // Forza linking via POST asincrona per un connettore esistente
  async function forceBridge(conn: Connector) {
    if (conn.sourceTool !== "rights-simulator" && conn.destTool !== "risk-manager") {
      addNotification(conn.id, "warning", "BRIDGE_INCOMPATIBLE", "Il force bridge è ottimizzato per FRIA → Risk Manager. Usa handshake per altri connettori.");
      return;
    }

    const bridgePayload = {
      simulationId: `sim-force-${Date.now()}`,
      systemName: "Sistema AI (Force Bridge)",
      frasScore: 0.72,
      overallRating: "high",
      affectedRights: ["dignity", "non-discrimination", "data-protection"],
      agenticViolation: false,
      oversightComplete: true,
      status: "completed" as const,
      completedAt: new Date().toISOString(),
    };

    addNotification(conn.id, "info", "BRIDGE_FORCE", "Forzatura linking asincrono FRIA → Risk Manager in corso...");
    const result = await forceAsyncLink(conn.destEndpoint, conn.apiKey, bridgePayload, conn.timeoutMs);

    // Genera mapping dal bridge
    const mapping = createDataMapping(
      bridgePayload.simulationId,
      `risk-bridged-${bridgePayload.simulationId}`,
      conn.id,
      conn.deepLinkTemplate,
      { id: bridgePayload.simulationId }
    );
    setMappings((prev) => {
      const updatedMaps = [mapping, ...prev];
      saveDataMappings(updatedMaps);
      return updatedMaps;
    });

    addNotification(conn.id, result.success ? "success" : "error", `BRIDGE_${result.action.toUpperCase()}`, result.message);
  }

  async function testHandshake(conn: Connector) {
    addNotification(conn.id, "info", "HANDSHAKE_START", `Handshake avviato verso ${conn.sourceEndpoint}`);
    const result = await performHandshake(conn.sourceEndpoint, conn.apiKey, conn.timeoutMs);

    setHandshakeResults((prev) => ({ ...prev, [conn.id]: result }));

    const newStatus: ConnectorStatus = result.success ? "connected" : "error";
    persistConnectors(
      connectors.map((c) =>
        c.id === conn.id
          ? { ...c, status: newStatus, lastHandshake: result.timestamp }
          : c
      )
    );

    if (!result.success) {
      addNotification(conn.id, "error", `HTTP ${result.statusCode}`, result.message);
    } else {
      addNotification(conn.id, "success", "HANDSHAKE_OK", result.message);
    }
  }

  async function testHeartbeat(conn: Connector) {
    const log = await sendHeartbeat(conn.sourceEndpoint, conn.apiKey, conn.timeoutMs);
    const logWithId = { ...log, connectorId: conn.id };

    const updatedLogs = [logWithId, ...heartbeatLogs].slice(0, 100);
    setHeartbeatLogs(updatedLogs);
    saveHeartbeatLogs(updatedLogs);

    persistConnectors(
      connectors.map((c) =>
        c.id === conn.id ? { ...c, lastHeartbeat: log.timestamp } : c
      )
    );

    if (!log.success) {
      addNotification(conn.id, "warning", "HEARTBEAT_FAIL", `Heartbeat fallito: ${log.error || `HTTP ${log.statusCode}`}`);
    }
  }

  function simulateWebhook(conn: Connector) {
    const listener = createWebhookListener(conn.id, (event) => {
      setWebhookEvents((prev) => {
        const updated = [event, ...prev].slice(0, 50);
        saveWebhookEvents(updated);
        return updated;
      });
    });

    const eventTypes: WebhookEvent["type"][] = ["created", "updated", "deleted"];
    const type = eventTypes[Math.floor(Math.random() * 3)];
    const payload = {
      id: `ext-${Date.now()}`,
      name: `Record da ${conn.sourceTool}`,
      status: type === "deleted" ? "removed" : "active",
    };

    const event = listener.handleEvent(payload, type);

    // Auto-generate mapping for created/updated
    if (type !== "deleted") {
      const mapping = createDataMapping(
        String(payload.id),
        `pk-${Date.now()}`,
        conn.id,
        conn.deepLinkTemplate,
        payload
      );
      setMappings((prev) => {
        const updated = [mapping, ...prev].slice(0, 200);
        saveDataMappings(updated);
        return updated;
      });
    }

    addNotification(conn.id, "info", `WEBHOOK_${type.toUpperCase()}`, `Evento webhook ${type}: ${payload.id}`);
  }

  function testUpsert(conn: Connector) {
    const externalId = `ext-upsert-test-${Date.now()}`;
    upsertRecord(
      conn.destEndpoint || conn.sourceEndpoint,
      conn.apiKey,
      externalId,
      { test: true, source: conn.sourceTool },
      conn.timeoutMs
    ).then((result) => {
      addNotification(
        conn.id,
        result.success ? "success" : "error",
        `UPSERT_${result.action.toUpperCase()}`,
        result.message
      );
    });
  }

  function toggleUpsert(conn: Connector) {
    persistConnectors(
      connectors.map((c) =>
        c.id === conn.id ? { ...c, upsertEnabled: !c.upsertEnabled } : c
      )
    );
  }

  function toggleApiKeyVisibility(id: string) {
    setShowApiKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  function dismissNotification(id: string) {
    setNotifications((prev) => {
      const updated = prev.map((n) => n.id === id ? { ...n, dismissed: true } : n);
      saveNotifications(updated);
      return updated;
    });
  }

  // ─── RENDER ─────────────────────────────────────────────────────

  const activeNotifications = notifications.filter((n) => !n.dismissed);
  const connectedCount = connectors.filter((c) => c.status === "connected").length;

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Connectors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Integration middleware — handshake Bearer, deep link, webhook listener,
            heartbeat 5min, upsert logic. Bypassa la UI, vai diretto al server.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={quickFRIABridge}
            className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
            title="Crea ponte FRIA → Risk Manager e forza linking asincrono"
          >
            <Zap className="h-4 w-4" />
            Quick Bridge FRIA
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuovo connettore
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Connessi", value: connectedCount, icon: Wifi, color: "text-success" },
          { label: "Mapping attivi", value: mappings.length, icon: Link, color: "text-primary" },
          { label: "Webhook eventi", value: webhookEvents.length, icon: Radio, color: "text-warning" },
          { label: "Notifiche", value: activeNotifications.length, icon: Bell, color: activeNotifications.length > 0 ? "text-danger" : "text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-muted/50 p-3">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground uppercase">
              <s.icon className="h-3 w-3" />
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-muted/50 p-5 mb-6 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Configura nuovo connettore</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome connettore (es: Risk Manager → Rights Simulator)"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase">Sorgente</label>
                <select
                  value={form.sourceTool}
                  onChange={(e) => setForm({ ...form, sourceTool: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {AVAILABLE_TOOLS.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase">Destinazione</label>
                <select
                  value={form.destTool}
                  onChange={(e) => setForm({ ...form, destTool: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {AVAILABLE_TOOLS.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase">Endpoint sorgente (URL API)</label>
              <input
                value={form.sourceEndpoint}
                onChange={(e) => setForm({ ...form, sourceEndpoint: e.target.value })}
                placeholder="https://api.aicomply.internal/v1/risk-manager"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase">Endpoint destinazione (URL API)</label>
              <input
                value={form.destEndpoint}
                onChange={(e) => setForm({ ...form, destEndpoint: e.target.value })}
                placeholder="https://api.aicomply.internal/v1/rights-simulator"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase">Bearer Token (non la password dell'account)</label>
              <input
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder="sk-aicomply-xxxxxxxxxxxxxxxxxxxxxxxx"
                type="password"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={addConnector}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Crea connettore
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-border px-4 py-2 text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Connector list */}
      <div className="space-y-4 mb-8">
        {connectors.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/30 p-12 text-center">
            <Radio className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-2">Nessun connettore configurato.</p>
            <p className="text-xs text-muted-foreground">
              Crea un connettore per collegare due strumenti con handshake Bearer, webhook e deep link.
            </p>
          </div>
        ) : (
          connectors.map((conn) => {
            const st = statusConfig[conn.status];
            const handshake = handshakeResults[conn.id];
            const showKey = showApiKeys[conn.id];

            return (
              <div
                key={conn.id}
                className={cls(
                  "rounded-xl border bg-card p-5 transition-colors",
                  selectedConnector?.id === conn.id ? "border-primary/50 ring-1 ring-primary/20" : "border-border hover:border-primary/20"
                )}
              >
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Radio className="h-5 w-5 text-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{conn.name}</span>
                        <span className={cls("text-[10px] font-medium rounded-full px-2 py-0.5 border", st.className)}>
                          <st.icon className="h-3 w-3 inline mr-1" />
                          {st.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                        <span>{AVAILABLE_TOOLS.find((t) => t.key === conn.sourceTool)?.label || conn.sourceTool}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{AVAILABLE_TOOLS.find((t) => t.key === conn.destTool)?.label || conn.destTool}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedConnector(selectedConnector?.id === conn.id ? null : conn)}
                      className="rounded-lg border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted transition-colors"
                    >
                      {selectedConnector?.id === conn.id ? "Chiudi" : "Dettagli"}
                    </button>
                    <button
                      onClick={() => removeConnector(conn.id)}
                      className="rounded-lg p-1 text-muted-foreground hover:text-danger transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Endpoint: </span>
                    <span className="text-foreground font-mono text-[10px]">{conn.sourceEndpoint}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">API Key: </span>
                    <button onClick={() => toggleApiKeyVisibility(conn.id)} className="text-foreground font-mono text-[10px] hover:text-primary">
                      {showKey ? conn.apiKey : maskApiKey(conn.apiKey)}
                      {showKey ? <EyeOff className="h-3 w-3 inline ml-1" /> : <Eye className="h-3 w-3 inline ml-1" />}
                    </button>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Timeout: </span>
                    <span className="text-foreground">{conn.timeoutMs}ms</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Upsert: </span>
                    <span className={conn.upsertEnabled ? "text-success" : "text-muted-foreground"}>
                      {conn.upsertEnabled ? "ON" : "OFF"}
                    </span>
                  </div>
                </div>

                {conn.lastHandshake && (
                  <div className="text-[10px] text-muted-foreground mb-3">
                    Handshake: {conn.lastHandshake.slice(0, 19)} · Heartbeat: {conn.lastHeartbeat ? conn.lastHeartbeat.slice(0, 19) : "—"}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => testHandshake(conn)}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Handshake
                  </button>
                  <button
                    onClick={() => testHeartbeat(conn)}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                  >
                    <Activity className="h-3.5 w-3.5" />
                    Heartbeat
                  </button>
                  <button
                    onClick={() => simulateWebhook(conn)}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                  >
                    <Radio className="h-3.5 w-3.5" />
                    Simula Webhook
                  </button>
                  <button
                    onClick={() => testUpsert(conn)}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Test Upsert
                  </button>
                  <button
                    onClick={() => toggleUpsert(conn)}
                    className={cls(
                      "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors",
                      conn.upsertEnabled
                        ? "border-success/30 text-success hover:bg-success/5"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {conn.upsertEnabled ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    Upsert: {conn.upsertEnabled ? "ON" : "OFF"}
                  </button>
                  <button
                    onClick={() => forceBridge(conn)}
                    className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs text-primary hover:bg-primary/10 transition-colors"
                    title="Forza linking asincrono FRIA → Risk Manager"
                  >
                    <Link className="h-3.5 w-3.5" />
                    Forza Linking
                  </button>
                </div>

                {/* Handshake result */}
                {handshake && (
                  <div className={cls(
                    "mt-3 rounded-lg border p-3 text-xs",
                    handshake.success ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      {handshake.success ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-danger" />
                      )}
                      <span className={handshake.success ? "text-success font-semibold" : "text-danger font-semibold"}>
                        HTTP {handshake.statusCode} — {handshake.success ? "OK" : getHttpErrorMessage(handshake.statusCode)}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{handshake.message}</p>
                    {handshake.responseBody && (
                      <pre className="mt-1 text-[10px] text-foreground/60 overflow-x-auto">{handshake.responseBody}</pre>
                    )}
                  </div>
                )}

                {/* Expanded detail panel */}
                {selectedConnector?.id === conn.id && (
                  <div className="mt-4 border-t border-border pt-4 space-y-4">
                    {/* Webhook + Deep Link info */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <h4 className="text-xs font-semibold text-foreground mb-1">Webhook URL</h4>
                        <div className="flex items-center gap-2">
                          <code className="text-[10px] text-muted-foreground break-all flex-1">{conn.webhookUrl}</code>
                          <button onClick={() => copyToClipboard(conn.webhookUrl)} className="text-muted-foreground hover:text-primary shrink-0">
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <h4 className="text-xs font-semibold text-foreground mb-1">Deep Link Template</h4>
                        <code className="text-[10px] text-muted-foreground break-all">{conn.deepLinkTemplate}</code>
                      </div>
                    </div>

                    {/* Mappings for this connector */}
                    <div>
                      <h4 className="text-xs font-semibold text-foreground mb-2">
                        Data Mappings ({mappings.filter((m) => m.connectorId === conn.id).length})
                      </h4>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {mappings.filter((m) => m.connectorId === conn.id).slice(0, 10).map((m) => (
                          <div key={m.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-[10px]">
                            <Link className="h-3 w-3 text-primary shrink-0" />
                            <span className="text-foreground font-mono">{m.sourceExternalId}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="text-foreground font-mono">{m.destPrimaryKey}</span>
                            <a
                              href={m.deepLink}
                              target="_blank"
                              rel="noopener"
                              className="text-primary hover:underline ml-auto truncate max-w-[200px]"
                            >
                              {m.deepLink}
                            </a>
                          </div>
                        ))}
                        {mappings.filter((m) => m.connectorId === conn.id).length === 0 && (
                          <p className="text-[10px] text-muted-foreground">Nessun mapping. Simula un webhook per crearne uno.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Notifications drawer */}
      {activeNotifications.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Bell className="h-4 w-4 text-warning" />
              Notifiche ({activeNotifications.length})
            </h3>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {activeNotifications.slice(0, 10).map((n) => (
              <div
                key={n.id}
                className={cls(
                  "flex items-start justify-between rounded-lg border px-3 py-2 text-xs",
                  n.type === "error" && "border-danger/20 bg-danger/5",
                  n.type === "warning" && "border-warning/20 bg-warning/5",
                  n.type === "success" && "border-success/20 bg-success/5",
                  n.type === "info" && "border-border bg-muted/30",
                )}
              >
                <div>
                  <span className="font-mono text-[10px] text-muted-foreground mr-2">[{n.code}]</span>
                  <span className="text-foreground">{n.message}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{n.timestamp.slice(11, 19)}</span>
                </div>
                <button onClick={() => dismissNotification(n.id)} className="text-muted-foreground hover:text-foreground shrink-0">
                  <XCircle className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Heartbeat logs */}
      {heartbeatLogs.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            Heartbeat Log ({heartbeatLogs.length})
          </h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {heartbeatLogs.slice(0, 15).map((log, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-[10px] font-mono">
                <span className={log.success ? "text-success" : "text-danger"}>
                  {log.success ? <CheckCircle className="h-3 w-3 inline" /> : <XCircle className="h-3 w-3 inline" />}
                </span>
                <span className="text-muted-foreground">{log.timestamp.slice(11, 19)}</span>
                <span className="text-foreground">HTTP {log.statusCode}</span>
                <span className="text-muted-foreground">{log.latencyMs}ms</span>
                {log.error && <span className="text-danger truncate">{log.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Webhook events */}
      {webhookEvents.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Radio className="h-4 w-4 text-muted-foreground" />
            Webhook Events ({webhookEvents.length})
          </h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {webhookEvents.slice(0, 15).map((evt) => (
              <div key={evt.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-[10px] font-mono">
                <span className={cls(
                  "rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase",
                  evt.type === "created" && "bg-success/10 text-success",
                  evt.type === "updated" && "bg-primary/10 text-primary",
                  evt.type === "deleted" && "bg-danger/10 text-danger",
                )}>
                  {evt.type}
                </span>
                <span className="text-muted-foreground">{evt.receivedAt.slice(11, 19)}</span>
                <span className="text-foreground">
                  {(evt.payload as any).id || evt.id.slice(0, 12)}
                </span>
                <span className={cls("ml-auto", evt.processed ? "text-success" : "text-warning")}>
                  {evt.processed ? "✓" : "..."}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer note */}
      <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">Middleware attivo:</strong> I connettori
        eseguono handshake via <code className="bg-muted px-1 rounded text-[10px]">GET /v1/account/me</code> con
        header <code className="bg-muted px-1 rounded text-[10px]">Authorization: Bearer &#123;API_KEY&#125;</code>.
        Heartbeat ogni 5 minuti. Webhook listener su eventi Created, Updated, Deleted.
        Upsert automatico in caso di 404. Timeout a 3 secondi con notifica.
      </div>
    </div>
  );
}
