// Sanitizza label/art/tooltip della sidebar rimuovendo annotazioni developer
// che non devono essere visibili all'utente finale.
export function sanitizeSidebarLabel(raw: string): string {
  return raw.replace(/\s*\[verify against current AI Act text\]/gi, "").trim();
}
