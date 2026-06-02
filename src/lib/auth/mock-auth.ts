"use server";

import { createClient } from "@/lib/supabase/server-actions";

// Backward-compatible type (same shape as before)
export type MockUser = {
  id: string;
  email: string;
  phone: string;
  company: string;
  lastLogin: string;
  phoneVerified: boolean;
};

export async function getSession(): Promise<MockUser | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return {
      id:            user.id,
      email:         user.email ?? "",
      phone:         (user.user_metadata?.phone as string) ?? "",
      company:       (user.user_metadata?.company as string) ?? "",
      lastLogin:     user.last_sign_in_at ?? new Date().toISOString(),
      phoneVerified: user.phone_confirmed_at != null,
    };
  } catch {
    return null;
  }
}

// These are no longer needed (Supabase manages session cookies automatically)
// but kept for backward compatibility — they are now no-ops
export async function setSession(_user: MockUser): Promise<void> {}
export async function setSessionLong(_user: MockUser): Promise<void> {}

export async function clearSession(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {}
}
