"use server";

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const SESSION_KEY = "aicomply_session";
const SECRET = process.env.SESSION_SECRET ?? "dev-only-change-in-production";

export type MockUser = {
  id: string;
  email: string;
  phone: string;
  company: string;
  lastLogin: string;
  phoneVerified: boolean;
};

function signPayload(payload: string): string {
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifyAndExtract(signed: string): string | null {
  const lastDot = signed.lastIndexOf(".");
  if (lastDot === -1) return null;
  const payload = signed.slice(0, lastDot);
  const sig = signed.slice(lastDot + 1);
  const expected = createHmac("sha256", SECRET).update(payload).digest("base64url");
  try {
    const sigBuf = Buffer.from(sig, "base64url");
    const expBuf = Buffer.from(expected, "base64url");
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;
  } catch {
    return null;
  }
  return payload;
}

const COOKIE_OPTS = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge,
  path: "/",
});

export async function setSession(user: MockUser) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_KEY, signPayload(JSON.stringify(user)), COOKIE_OPTS(60 * 60 * 24 * 30));
}

export async function setSessionLong(user: MockUser) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_KEY, signPayload(JSON.stringify(user)), COOKIE_OPTS(60 * 60 * 24 * 365));
}

export async function getSession(): Promise<MockUser | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_KEY);
    if (!session) return null;
    const payload = verifyAndExtract(session.value);
    if (!payload) return null;
    return JSON.parse(payload) as MockUser;
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_KEY);
}
