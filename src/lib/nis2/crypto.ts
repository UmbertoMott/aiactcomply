"use client";

// Cifratura dei documenti NIS 2 nel browser: AES-256-GCM (Web Crypto).
// La chiave dell'organizzazione è generata qui e conservata in IndexedDB; il server
// (archivio cloud, quando sarà collegato) riceverà solo file cifrati.
// La chiave di recupero è la stessa chiave in forma testuale: chi la possiede può
// leggere i documenti, quindi va custodita dall'amministratore fuori dalla piattaforma.

import { idb } from "./idb";

const KEY_ID = "org-key";
const PREFIX = "RGOS-NIS2-KEY-v1:";
export const KEY_EVENT = "aicomply-nis2-key-change";

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf instanceof Uint8Array ? buf : new Uint8Array(buf))));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function storedKey(): Promise<CryptoKey | undefined> {
  return idb<CryptoKey | undefined>("keys", "readonly", (s) => s.get(KEY_ID) as IDBRequest<CryptoKey | undefined>);
}

async function saveKey(key: CryptoKey) {
  await idb("keys", "readwrite", (s) => s.put(key, KEY_ID));
  window.dispatchEvent(new Event(KEY_EVENT));
}

/** Impronta breve della chiave (primi 16 caratteri esadecimali dello SHA-256), per riconoscerla */
export async function keyFingerprint(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", raw));
  return Array.from(hash.slice(0, 8)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase().replace(/(.{4})(?=.)/g, "$1-");
}

export async function getKey(): Promise<CryptoKey | undefined> {
  return storedKey();
}

/** Chiave esistente o, al primo uso, una nuova chiave AES-256 */
export async function getOrCreateKey(): Promise<CryptoKey> {
  const existing = await storedKey();
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  await saveKey(key);
  return key;
}

export async function encryptBlob(blob: Blob): Promise<{ data: Blob; iv: string; keyId: string }> {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, await blob.arrayBuffer());
  return { data: new Blob([ct], { type: "application/octet-stream" }), iv: b64(iv), keyId: await keyFingerprint(key) };
}

export async function decryptBlob(data: Blob, iv: string, type: string): Promise<Blob> {
  const key = await storedKey();
  if (!key) throw new Error("missing_key");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, key, await data.arrayBuffer());
  return new Blob([pt], { type: type || "application/octet-stream" });
}

/** Testo della chiave di recupero, da scaricare e custodire */
export async function exportRecoveryKey(): Promise<string> {
  const key = await getOrCreateKey();
  return PREFIX + b64(await crypto.subtle.exportKey("raw", key));
}

/** Importa una chiave di recupero (es. su un altro dispositivo); restituisce l'impronta */
export async function importRecoveryKey(text: string): Promise<string> {
  const clean = text.trim();
  if (!clean.startsWith(PREFIX)) throw new Error("invalid_key");
  let raw: Uint8Array<ArrayBuffer>;
  try { raw = unb64(clean.slice(PREFIX.length)); } catch { throw new Error("invalid_key"); }
  if (raw.length !== 32) throw new Error("invalid_key");
  const key = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
  await saveKey(key);
  return keyFingerprint(key);
}
