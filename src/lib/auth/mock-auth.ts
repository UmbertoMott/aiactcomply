"use server";

import { cookies } from "next/headers";

const SESSION_KEY = "aicomply_session";

type MockUser = {
  id: string;
  email: string;
  phone: string;
  company: string;
  lastLogin: string;
  phoneVerified: boolean;
};

export async function setSession(user: MockUser) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_KEY, JSON.stringify(user), {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function setSessionLong(user: MockUser) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_KEY, JSON.stringify(user), {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}

export async function getSession(): Promise<MockUser | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_KEY);
    if (!session) return null;
    return JSON.parse(session.value);
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_KEY);
}
