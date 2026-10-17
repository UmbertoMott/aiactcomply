"use client";

// Operazioni sui documenti NIS 2: cifra e salva, apre (decifra), elimina.

import { decryptBlob, encryptBlob } from "./crypto";
import { fileStorage, storageFor } from "./file-storage";
import type { Nis2DocMeta } from "./store";

export async function saveDocument(file: File): Promise<Nis2DocMeta> {
  const id = crypto.randomUUID();
  const { data, iv, keyId } = await encryptBlob(file);
  await fileStorage.put(id, data);
  return { id, name: file.name, size: file.size, type: file.type, addedAt: new Date().toISOString(), iv, keyId, storage: fileStorage.kind };
}

/** Contenuto in chiaro del documento; i file salvati prima della cifratura sono restituiti così come sono */
export async function readDocument(meta: Nis2DocMeta): Promise<Blob> {
  const data = await storageFor(meta.storage).get(meta.id);
  if (!data) throw new Error("not_found");
  return meta.iv ? decryptBlob(data, meta.iv, meta.type) : data;
}

export async function removeDocument(meta: Nis2DocMeta): Promise<void> {
  await storageFor(meta.storage).remove(meta.id);
}
