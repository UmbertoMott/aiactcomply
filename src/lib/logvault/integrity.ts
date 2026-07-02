// SHA-256 integrity hashing for LogVault events — PROMPT BE
// Web Crypto API — browser + Node 20+

export async function computeEventHash(data: {
  id: string;
  timestamp: string;
  category: string;
  severity: string;
  description: string;
  operator?: string;
}): Promise<string> {
  const canonical = JSON.stringify({
    id: data.id,
    timestamp: data.timestamp,
    category: data.category,
    severity: data.severity,
    description: data.description,
    operator: data.operator ?? null,
  });
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyEventIntegrity(event: {
  id: string;
  timestamp: string;
  category: string;
  severity: string;
  description: string;
  operator?: string;
  integrityHash: string;
}): Promise<boolean> {
  const expected = await computeEventHash(event);
  return expected === event.integrityHash;
}
