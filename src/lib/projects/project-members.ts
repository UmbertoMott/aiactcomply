// src/lib/projects/project-members.ts
// Membri di un progetto — storage scoped per progetto (aicomply_p_<id>_members).
// Il proprietario (te) è implicito e non è in questa lista: qui stanno solo i
// membri invitati. Il limite dipende dal piano (vedi lib/billing/plan.ts).

export type MemberStatus = "pending" | "active";

export interface ProjectMember {
  id: string;
  email: string;
  status: MemberStatus;
  invitedAt: string;
}

const MEMBERS_EVENT = "aicomply:membreschanged";

function membersKey(projectId: string): string {
  return `aicomply_p_${projectId}_members`;
}

function safeRead(projectId: string): ProjectMember[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(membersKey(projectId));
    return raw ? (JSON.parse(raw) as ProjectMember[]) : [];
  } catch {
    return [];
  }
}

function safeWrite(projectId: string, members: ProjectMember[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(membersKey(projectId), JSON.stringify(members));
    window.dispatchEvent(new Event(MEMBERS_EVENT));
  } catch {}
}

export function listMembers(projectId: string): ProjectMember[] {
  return safeRead(projectId);
}

/** true se l'email è già presente (case-insensitive). */
export function hasMember(projectId: string, email: string): boolean {
  const e = email.trim().toLowerCase();
  return safeRead(projectId).some((m) => m.email.toLowerCase() === e);
}

/** Aggiunge un membro come "in attesa". Ritorna null se email non valida o duplicata. */
export function addMember(projectId: string, email: string): ProjectMember | null {
  const clean = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return null;
  if (hasMember(projectId, clean)) return null;

  const member: ProjectMember = {
    id: crypto.randomUUID(),
    email: clean,
    status: "pending",
    invitedAt: new Date().toISOString(),
  };
  safeWrite(projectId, [...safeRead(projectId), member]);
  return member;
}

export function removeMember(projectId: string, memberId: string): void {
  safeWrite(projectId, safeRead(projectId).filter((m) => m.id !== memberId));
}

/** Link invito condivisibile (painted-door): porta alla registrazione con token progetto. */
export function buildInviteLink(projectId: string): string {
  const token = btoa(`${projectId}:${Date.now()}`).replace(/=/g, "");
  const base = typeof window !== "undefined" ? window.location.origin : "https://www.regulaeos.com";
  return `${base}/waitlist?invite=${token}`;
}

export const MEMBERS_EVENT_NAME = MEMBERS_EVENT;
