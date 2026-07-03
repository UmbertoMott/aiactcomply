// Notifications Engine — AIComply

export type NotificationPriority = "critical" | "high" | "medium" | "info";
export type NotificationCategory =
  | "deadline"
  | "tool_incomplete"
  | "risk_alert"
  | "gpai"
  | "system"
  | "achievement";

export interface AIComplyNotification {
  id: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  category: NotificationCategory;
  createdAt: string;
  expiresAt?: string;
  readAt?: string;
  dismissedAt?: string;
  actionLabel?: string;
  actionHref?: string;
  relatedArticle?: string;
  icon?: string;
}

export interface RegulatoryDeadline {
  id: string;
  date: string;
  title: string;
  description: string;
  article: string;
  affectsRiskLevels: ("high" | "limited" | "minimal" | "gpai" | "all")[];
  mandatoryTools: string[];
  externalLink?: string;
}

export const REGULATORY_DEADLINES: RegulatoryDeadline[] = [
  {
    id: "art5-2025-02",
    date: "2025-02-02",
    title: "Pratiche vietate — Art. 5",
    description: "Le pratiche AI vietate sono operative. Verifica che il tuo sistema non ricada in nessuna delle categorie proibite.",
    article: "Art. 5",
    affectsRiskLevels: ["all"],
    mandatoryTools: ["/dashboard/tools/prohibited"],
    externalLink: "https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32024R1689",
  },
  {
    id: "gpai-2025-08",
    date: "2025-08-02",
    title: "Obblighi GPAI — Art. 51-55",
    description: "In vigore gli obblighi per provider e deployer di General Purpose AI. Se usi OpenAI, Anthropic o Google AI devi essere conforme.",
    article: "Art. 51-55",
    affectsRiskLevels: ["gpai"],
    mandatoryTools: ["/dashboard/modules/gpai"],
  },
  {
    id: "high-risk-2026-08",
    date: "2026-08-02",
    title: "Sistemi ad alto rischio — Allegato III",
    description: "Tutti i sistemi AI ad alto rischio dell'Allegato III devono essere conformi. Obblighi: Art. 9-17, registrazione banca dati UE.",
    article: "Art. 9-17 + Art. 49",
    affectsRiskLevels: ["high"],
    mandatoryTools: [
      "/dashboard/tools/risk-manager",
      "/dashboard/tools/data-audit",
      "/dashboard/tools/docugen",
      "/dashboard/tools/logvault",
      "/dashboard/tools/transparency",
      "/dashboard/tools/oversight",
      "/dashboard/tools/resilience",
      "/dashboard/tools/qms",
    ],
  },
  {
    id: "high-risk-legacy-2027-08",
    date: "2027-08-02",
    title: "Sistemi ad alto rischio — Allegato III pt. 6-8",
    description: "Sistemi AI ad alto rischio già in uso prima del 2 agosto 2026 devono completare la conformità (Allegato III punti 6-8).",
    article: "Art. 111 — Disposizioni transitorie",
    affectsRiskLevels: ["high"],
    mandatoryTools: [],
  },
];

export function generateDeadlineNotifications(today: Date = new Date()): AIComplyNotification[] {
  const notifications: AIComplyNotification[] = [];

  for (const deadline of REGULATORY_DEADLINES) {
    const deadlineDate = new Date(deadline.date);
    const daysUntil = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      notifications.push({
        id: `deadline-past-${deadline.id}`,
        title: `Scadenza passata: ${deadline.title}`,
        body: `La scadenza del ${deadlineDate.toLocaleDateString("it-IT")} è già trascorsa. Verifica la tua conformità immediatamente.`,
        priority: "critical",
        category: "deadline",
        createdAt: today.toISOString(),
        relatedArticle: deadline.article,
        actionLabel: "Verifica ora",
        actionHref: deadline.mandatoryTools[0] || "/dashboard",
        icon: "AlertOctagon",
      });
      continue;
    }

    if (daysUntil <= 30) {
      notifications.push({
        id: `deadline-urgent-${deadline.id}`,
        title: `${daysUntil} giorni alla scadenza: ${deadline.title}`,
        body: `${deadline.description} Scadenza: ${deadlineDate.toLocaleDateString("it-IT")}.`,
        priority: "critical",
        category: "deadline",
        createdAt: today.toISOString(),
        expiresAt: deadline.date,
        relatedArticle: deadline.article,
        actionLabel: "Completa ora",
        actionHref: deadline.mandatoryTools[0] || "/dashboard",
        icon: "AlertTriangle",
      });
      continue;
    }

    if (daysUntil <= 90) {
      notifications.push({
        id: `deadline-soon-${deadline.id}`,
        title: `${daysUntil} giorni: ${deadline.title}`,
        body: `${deadline.description}`,
        priority: "high",
        category: "deadline",
        createdAt: today.toISOString(),
        expiresAt: deadline.date,
        relatedArticle: deadline.article,
        actionLabel: "Prepara compliance",
        actionHref: deadline.mandatoryTools[0] || "/dashboard",
        icon: "Clock",
      });
      continue;
    }

    if (daysUntil <= 180) {
      notifications.push({
        id: `deadline-upcoming-${deadline.id}`,
        title: `Scadenza in ${daysUntil} giorni: ${deadline.title}`,
        body: `Hai tempo, ma è il momento giusto per iniziare. ${deadline.description}`,
        priority: "medium",
        category: "deadline",
        createdAt: today.toISOString(),
        expiresAt: deadline.date,
        relatedArticle: deadline.article,
        actionLabel: "Inizia ora",
        actionHref: deadline.mandatoryTools[0] || "/dashboard",
        icon: "Calendar",
      });
    }
  }

  return notifications;
}

export function generateProgressNotifications(
  completedTools: string[],
  riskLevel: string | null
): AIComplyNotification[] {
  const notifications: AIComplyNotification[] = [];
  const today = new Date().toISOString();

  if (riskLevel === "high" || riskLevel === "High") {
    const highRiskDeadline = REGULATORY_DEADLINES.find((d) => d.id === "high-risk-2026-08");
    if (highRiskDeadline) {
      const missingTools = highRiskDeadline.mandatoryTools.filter(
        (tool) => !completedTools.some((ct) => ct.includes(tool.split("/").pop()!))
      );

      if (missingTools.length > 0) {
        notifications.push({
          id: "missing-high-risk-tools",
          title: `${missingTools.length} tool obbligatori da completare`,
          body: `Il tuo sistema è ad alto rischio (Allegato III). Hai ${missingTools.length} tool di compliance ancora da completare prima del 2 agosto 2026.`,
          priority: missingTools.length > 5 ? "critical" : "high",
          category: "tool_incomplete",
          createdAt: today,
          actionLabel: "Vedi tool mancanti",
          actionHref: "/dashboard",
          icon: "ClipboardList",
          relatedArticle: "Art. 9-17",
        });
      }

      if (completedTools.length > 0 && missingTools.length === 0) {
        notifications.push({
          id: "all-tools-complete",
          title: "✅ Tutti i tool completati!",
          body: "Ottimo lavoro. Tutti i tool di compliance per sistemi ad alto rischio sono stati completati. Genera il dossier finale.",
          priority: "info",
          category: "achievement",
          createdAt: today,
          actionLabel: "Genera Dossier",
          actionHref: "/dashboard/dossier",
          icon: "Award",
        });
      }
    }
  }

  if (completedTools.length === 0) {
    notifications.push({
      id: "no-tools-started",
      title: "Inizia il tuo percorso di compliance",
      body: "Non hai ancora completato nessun tool. Inizia dal Classifier per capire il livello di rischio del tuo sistema AI.",
      priority: "medium",
      category: "tool_incomplete",
      createdAt: today,
      actionLabel: "Inizia con Classifier",
      actionHref: "/dashboard/tools/classifier",
      icon: "Play",
    });
  }

  return notifications;
}

const NOTIF_STORAGE_KEY = "aicomply_notifications";
const DISMISSED_KEY = "aicomply_notifications_dismissed";

export function loadNotifications(): AIComplyNotification[] {
  try {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem(NOTIF_STORAGE_KEY) || "[]");
  } catch { return []; }
}

export function saveNotifications(n: AIComplyNotification[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(n));
}

export function loadDismissed(): string[] {
  try {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch { return []; }
}

export function saveDismissed(ids: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
}

export function mergeNotifications(
  existing: AIComplyNotification[],
  fresh: AIComplyNotification[],
  dismissed: string[]
): AIComplyNotification[] {
  const existingIds = new Set(existing.map((n) => n.id));
  const newOnes = fresh.filter((n) => !existingIds.has(n.id) && !dismissed.includes(n.id));
  return [...newOnes, ...existing]
    .filter((n) => !dismissed.includes(n.id))
    .slice(0, 50);
}

export function getUnreadCount(notifications: AIComplyNotification[]): number {
  return notifications.filter((n) => !n.readAt && !n.dismissedAt).length;
}

export function priorityOrder(p: NotificationPriority): number {
  return { critical: 0, high: 1, medium: 2, info: 3 }[p];
}

export function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "adesso";
    if (minutes < 60) return `${minutes} min fa`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ore fa`;
    const days = Math.floor(hours / 24);
    return `${days} giorni fa`;
  } catch { return ""; }
}

export function getNextUpcomingDeadline(): RegulatoryDeadline | null {
  const today = new Date();
  return REGULATORY_DEADLINES
    .filter((d) => new Date(d.date) > today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null;
}

export function daysUntil(isoDate: string): number {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}
