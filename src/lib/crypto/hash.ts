export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashObject(obj: Record<string, unknown>): Promise<string> {
  return sha256(JSON.stringify(obj, Object.keys(obj).sort()));
}

export function generateProofChain(
  records: { hash: string; id: string }[]
): string {
  return records.map((r) => r.hash.slice(0, 8)).join(":");
}

export function shortHash(hash: string): string {
  return hash.slice(0, 12);
}
