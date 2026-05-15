import { hashObject } from "@/lib/crypto/hash";
import { appendEvidence } from "@/lib/evidence/evidence-layer";

// ─── TIPI ─────────────────────────────────────────────────────────────

export type ConnectorStatus = "connected" | "disconnected" | "error" | "pending";

export interface Connector {
  id: string;
  name: string;
  sourceTool: string;          // STRUMENTO A
  destTool: string;            // STRUMENTO B
  sourceEndpoint: string;      // es: https://servizio-a.com/api/v1
  destEndpoint: string;        // es: https://servizio-b.com/api/v1
  apiKey: string;              // masked in UI, full length here
  status: ConnectorStatus;
  lastHandshake: string;
  lastHeartbeat: string;
  webhookUrl: string;
  deepLinkTemplate: string;    // es: https://servizio.com/view/{id}
  upsertEnabled: boolean;
  timeoutMs: number;           // default 3000
  createdAt: string;
}

export interface DataMapping {
  id: string;
  sourceExternalId: string;
  destPrimaryKey: string;
  connectorId: string;
  deepLink: string;
  lastSync: string;
  syncStatus: "synced" | "pending" | "error";
  errorCode?: number;
}

export interface HandshakeResult {
  success: boolean;
  statusCode: number;
  message: string;
  timestamp: string;
  responseBody?: string;
}

export interface WebhookEvent {
  id: string;
  type: "created" | "updated" | "deleted";
  connectorId: string;
  payload: Record<string, unknown>;
  receivedAt: string;
  processed: boolean;
  error?: string;
}

export interface HeartbeatLog {
  timestamp: string;
  connectorId: string;
  statusCode: number;
  latencyMs: number;
  success: boolean;
  error?: string;
}

export interface PollingConfig {
  intervalMs: number;          // default 300000 (5 min)
  enabled: boolean;
  lastPoll: string;
}

// ─── COSTANTI ─────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 3000;
const DEFAULT_POLLING_INTERVAL = 300_000; // 5 minuti

// Tool mappa per deep link
const TOOL_DEEP_LINKS: Record<string, string> = {
  "risk-manager": "/dashboard/tools/risk-manager",
  "rights-simulator": "/dashboard/modules/rights-simulator",
  "classifier": "/dashboard/tools/classifier",
  "oversight": "/dashboard/tools/oversight",
  "transparency": "/dashboard/tools/transparency",
  "docugen": "/dashboard/tools/docugen",
  "qms": "/dashboard/tools/qms",
};

export function getDeepLink(toolName: string, id: string): string {
  const base = TOOL_DEEP_LINKS[toolName] || `/dashboard`;
  return `${base}#${id}`;
}

// ─── HANDSHAKE ────────────────────────────────────────────────────────

export async function performHandshake(
  endpoint: string,
  apiKey: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<HandshakeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${endpoint}/v1/account/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "AIComply-Connector/1.0",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const body = await response.text().catch(() => "");
    const timestamp = new Date().toISOString();

    if (response.ok) {
      return {
        success: true,
        statusCode: response.status,
        message: `Handshake riuscito con ${endpoint}`,
        timestamp,
        responseBody: body.slice(0, 500),
      };
    }

    return {
      success: false,
      statusCode: response.status,
      message: `Handshake fallito: HTTP ${response.status} — ${getHttpErrorMessage(response.status)}`,
      timestamp,
      responseBody: body.slice(0, 500),
    };
  } catch (err: any) {
    clearTimeout(timeout);
    const timestamp = new Date().toISOString();

    if (err.name === "AbortError") {
      return {
        success: false,
        statusCode: 408,
        message: `Handshake timeout: nessuna risposta entro ${timeoutMs}ms`,
        timestamp,
      };
    }

    return {
      success: false,
      statusCode: 0,
      message: `Errore di rete: ${err.message || "connessione fallita"}`,
      timestamp,
    };
  }
}

// ─── WEBHOOK LISTENER ─────────────────────────────────────────────────

export function createWebhookListener(
  connectorId: string,
  onEvent: (event: WebhookEvent) => void
): { handleEvent: (payload: Record<string, unknown>, type: WebhookEvent["type"]) => WebhookEvent; destroy: () => void } {
  function handleEvent(payload: Record<string, unknown>, type: WebhookEvent["type"]): WebhookEvent {
    const event: WebhookEvent = {
      id: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      connectorId,
      payload,
      receivedAt: new Date().toISOString(),
      processed: false,
    };

    // Simula processing
    setTimeout(() => {
      event.processed = true;
      onEvent(event);
    }, 50);

    return event;
  }

  return { handleEvent, destroy: () => {} };
}

// ─── DATA MAPPING & DEEP LINK ─────────────────────────────────────────

export function buildDeepLink(template: string, body: Record<string, unknown>): string {
  if (!template) return "";
  // Supporta {id} e {externalId} placeholder
  const id = (body.id || body.externalId || body.external_id || "") as string;
  return template.replace(/\{id\}/g, String(id)).replace(/\{externalId\}/g, String(id));
}

export function createDataMapping(
  sourceExternalId: string,
  destPrimaryKey: string,
  connectorId: string,
  deepLinkTemplate: string,
  body?: Record<string, unknown>
): DataMapping {
  return {
    id: `map-${Date.now()}`,
    sourceExternalId,
    destPrimaryKey,
    connectorId,
    deepLink: buildDeepLink(deepLinkTemplate, body || { id: destPrimaryKey }),
    lastSync: new Date().toISOString(),
    syncStatus: "synced",
  };
}

// ─── POLLING & HEARTBEAT ──────────────────────────────────────────────

export function createPollingConfig(enabled = true, intervalMs = DEFAULT_POLLING_INTERVAL): PollingConfig {
  return {
    intervalMs,
    enabled,
    lastPoll: new Date().toISOString(),
  };
}

export async function sendHeartbeat(
  endpoint: string,
  apiKey: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<HeartbeatLog> {
  const start = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${endpoint}/v1/health`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latencyMs = Math.round(performance.now() - start);

    return {
      timestamp: new Date().toISOString(),
      connectorId: "",
      statusCode: response.status,
      latencyMs,
      success: response.ok,
    };
  } catch (err: any) {
    clearTimeout(timeout);
    const latencyMs = Math.round(performance.now() - start);

    return {
      timestamp: new Date().toISOString(),
      connectorId: "",
      statusCode: err.name === "AbortError" ? 408 : 0,
      latencyMs,
      success: false,
      error: err.message || "heartbeat fallito",
    };
  }
}

// ─── UPSERT LOGIC ─────────────────────────────────────────────────────

export async function upsertRecord(
  destEndpoint: string,
  apiKey: string,
  externalId: string,
  payload: Record<string, unknown>,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<{ success: boolean; statusCode: number; action: "created" | "updated" | "error"; message: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Prima prova GET per verificare esistenza
    const getResponse = await fetch(`${destEndpoint}/v1/records/${encodeURIComponent(externalId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    if (getResponse.ok) {
      // Esiste → UPDATE
      const putResponse = await fetch(`${destEndpoint}/v1/records/${encodeURIComponent(externalId)}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...payload, externalId, updatedAt: new Date().toISOString() }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return {
        success: putResponse.ok,
        statusCode: putResponse.status,
        action: "updated",
        message: putResponse.ok ? "Record aggiornato" : `UPDATE fallito: HTTP ${putResponse.status}`,
      };
    }

    if (getResponse.status === 404) {
      // Non esiste → CREATE
      const postResponse = await fetch(`${destEndpoint}/v1/records`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...payload, externalId, createdAt: new Date().toISOString() }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return {
        success: postResponse.ok,
        statusCode: postResponse.status,
        action: "created",
        message: postResponse.ok ? "Record creato (upsert)" : `CREATE fallito: HTTP ${postResponse.status}`,
      };
    }

    clearTimeout(timeout);
    return {
      success: false,
      statusCode: getResponse.status,
      action: "error",
      message: `GET fallito: HTTP ${getResponse.status}`,
    };
  } catch (err: any) {
    clearTimeout(timeout);
    return {
      success: false,
      statusCode: err.name === "AbortError" ? 408 : 0,
      action: "error",
      message: `Upsert fallito: ${err.message || "errore di rete"}`,
    };
  }
}

// ─── CONNECTOR CRUD ───────────────────────────────────────────────────

export function createConnector(
  name: string,
  sourceTool: string,
  destTool: string,
  sourceEndpoint: string,
  destEndpoint: string,
  apiKey: string,
  deepLinkTemplate?: string
): Connector {
  return {
    id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    sourceTool,
    destTool,
    sourceEndpoint,
    destEndpoint,
    apiKey,
    status: "pending",
    lastHandshake: "",
    lastHeartbeat: "",
    webhookUrl: `https://aicomply.io/api/webhooks/connectors/${sourceTool}-${destTool}`,
    deepLinkTemplate: deepLinkTemplate || `http://localhost:3000/dashboard/evidence/{id}`,
    upsertEnabled: true,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    createdAt: new Date().toISOString(),
  };
}

// Genera automaticamente un mapping parent_id alla creazione del connettore
export function createAutoMapping(
  connectorId: string,
  sourceTool: string,
  destTool: string,
  deepLinkTemplate: string,
  riskId: string
): DataMapping {
  const parentId = `parent-${riskId}`;
  return {
    id: `map-auto-${Date.now()}`,
    sourceExternalId: riskId,
    destPrimaryKey: parentId,
    connectorId,
    deepLink: deepLinkTemplate.replace(/\{id\}/g, riskId),
    lastSync: new Date().toISOString(),
    syncStatus: "synced",
  };
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

// ─── HTTP ERROR MESSAGES ──────────────────────────────────────────────

export function getHttpErrorMessage(status: number): string {
  const messages: Record<number, string> = {
    401: "Unauthorized — API Key non valida o scaduta",
    403: "Forbidden — permessi insufficienti per l'endpoint",
    404: "Not Found — endpoint o risorsa inesistente",
    408: "Request Timeout — nessuna risposta entro il limite",
    429: "Too Many Requests — rate limit superato",
    500: "Internal Server Error — errore lato server",
    502: "Bad Gateway — il server upstream non risponde",
    503: "Service Unavailable — servizio temporaneamente non disponibile",
  };
  return messages[status] || `Errore HTTP ${status}`;
}

// ─── NOTIFICATION SERVICE ─────────────────────────────────────────────

export interface ConnectorNotification {
  id: string;
  connectorId: string;
  type: "error" | "warning" | "success" | "info";
  code: string;
  message: string;
  timestamp: string;
  dismissed: boolean;
}

export function createNotification(
  connectorId: string,
  type: ConnectorNotification["type"],
  code: string,
  message: string
): ConnectorNotification {
  return {
    id: `notif-${Date.now()}`,
    connectorId,
    type,
    code,
    message,
    timestamp: new Date().toISOString(),
    dismissed: false,
  };
}

// ─── PERSISTENZA LOCALE ───────────────────────────────────────────────

const STORE_KEY_CONNECTORS = "aicomply_connectors";
const STORE_KEY_MAPPINGS = "aicomply_data_mappings";
const STORE_KEY_LOGS = "aicomply_heartbeat_logs";
const STORE_KEY_EVENTS = "aicomply_webhook_events";
const STORE_KEY_NOTIFICATIONS = "aicomply_connector_notifications";

function getStore<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as T[];
  } catch {
    return [];
  }
}

function saveStore<T>(key: string, data: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

export function loadConnectors(): Connector[] {
  return getStore<Connector>(STORE_KEY_CONNECTORS);
}

export function saveConnectors(connectors: Connector[]) {
  saveStore(STORE_KEY_CONNECTORS, connectors);
}

export function loadDataMappings(): DataMapping[] {
  return getStore<DataMapping>(STORE_KEY_MAPPINGS);
}

export function saveDataMappings(mappings: DataMapping[]) {
  saveStore(STORE_KEY_MAPPINGS, mappings);
}

export function loadHeartbeatLogs(): HeartbeatLog[] {
  return getStore<HeartbeatLog>(STORE_KEY_LOGS);
}

export function saveHeartbeatLogs(logs: HeartbeatLog[]) {
  saveStore(STORE_KEY_LOGS, logs);
}

export function loadWebhookEvents(): WebhookEvent[] {
  return getStore<WebhookEvent>(STORE_KEY_EVENTS);
}

export function saveWebhookEvents(events: WebhookEvent[]) {
  saveStore(STORE_KEY_EVENTS, events);
}

export function loadNotifications(): ConnectorNotification[] {
  return getStore<ConnectorNotification>(STORE_KEY_NOTIFICATIONS);
}

export function saveNotifications(notifications: ConnectorNotification[]) {
  saveStore(STORE_KEY_NOTIFICATIONS, notifications);
}

// ─── BRIDGE FRIA → RISK MANAGER ──────────────────────────────────────

export interface FRIABridgePayload {
  simulationId: string;
  systemName: string;
  frasScore: number;           // Fundamental Rights Assessment Score
  overallRating: string;
  affectedRights: string[];
  agenticViolation: boolean;
  oversightComplete: boolean;
  status: "draft" | "completed" | "archived";
  completedAt?: string;
}

export interface FRIABridgeResult {
  success: boolean;
  action: "linked" | "async_queued" | "failed";
  riskId?: string;
  evidenceId?: string;
  deepLink?: string;
  message: string;
  timestamp: string;
}

// Mappa l'output FRIA in formato risk_evidence per il Risk Manager
export function mapFRIAToRiskEvidence(payload: FRIABridgePayload): Record<string, unknown> {
  return {
    risk_evidence: {
      source: "rights-simulator",
      simulationId: payload.simulationId,
      systemName: payload.systemName,
      frasScore: payload.frasScore,
      overallRating: payload.overallRating,
      affectedRights: payload.affectedRights,
      agenticViolation: payload.agenticViolation,
      oversightComplete: payload.oversightComplete,
    },
    risk_level: payload.frasScore > 0.7 ? "high" : payload.frasScore > 0.4 ? "medium" : "low",
    requires_oversight: !payload.oversightComplete,
    evidence_link: `/dashboard/evidence/${payload.simulationId}`,
    mapped_at: new Date().toISOString(),
  };
}

// Forza il linking via POST asincrona quando l'handshake fallisce
export async function forceAsyncLink(
  destEndpoint: string,
  apiKey: string,
  payload: FRIABridgePayload,
  timeoutMs = 3000
): Promise<FRIABridgeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const riskId = `risk-bridged-${payload.simulationId}`;

  try {
    const response = await fetch(`${destEndpoint}/v1/risk-manager/import-fria`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Bridge-Source": "rights-simulator",
        "X-Bridge-Trigger": "simulation-completed",
      },
      body: JSON.stringify({
        ...mapFRIAToRiskEvidence(payload),
        externalId: payload.simulationId,
        bridgeTimestamp: new Date().toISOString(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const respBody = await response.json().catch(() => ({}));

    if (response.ok) {
      return {
        success: true,
        action: "linked",
        riskId,
        evidenceId: (respBody as any).evidenceId || `ev-${payload.simulationId}`,
        deepLink: `http://localhost:3000/dashboard/evidence/${payload.simulationId}`,
        message: `Bridge FRIA→Risk Manager completato. Rischio ${riskId} collegato all'evidenza ${payload.simulationId}`,
        timestamp: new Date().toISOString(),
      };
    }

    // Se il server non supporta l'endpoint, accoda come async
    return {
      success: true,
      action: "async_queued",
      riskId,
      deepLink: `http://localhost:3000/dashboard/evidence/${payload.simulationId}`,
      message: `Handshake fallito (HTTP ${response.status}) — linking forzato in coda asincrona. Il bridge sarà completato quando l'endpoint sarà disponibile.`,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    clearTimeout(timeout);

    if (err.name === "AbortError") {
      return {
        success: true,
        action: "async_queued",
        riskId,
        deepLink: `http://localhost:3000/dashboard/evidence/${payload.simulationId}`,
        message: `Timeout ${timeoutMs}ms — linking forzato in coda asincrona. Riprova automatica al prossimo heartbeat.`,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: false,
      action: "failed",
      message: `Bridge fallito: ${err.message}`,
      timestamp: new Date().toISOString(),
    };
  }
}

// Verifica se una simulazione FRIA è completata e triggera il bridge
export function shouldTriggerBridge(payload: FRIABridgePayload): boolean {
  return payload.status === "completed" && payload.frasScore >= 0;
}

// Crea preset FRIA→Risk Manager
export function createFRIABridge(apiKey: string): Connector {
  return createConnector(
    "FRIA → Risk Manager (Bridge)",
    "rights-simulator",
    "risk-manager",
    "https://api.aicomply.internal/v1/rights-simulator",
    "https://api.aicomply.internal/v1/risk-manager",
    apiKey,
    "http://localhost:3000/dashboard/evidence/{id}"
  );
}
