"use server";

import { clearSession } from "@/lib/auth/mock-auth";
import { redirect } from "next/navigation";

export async function logout() {
  await clearSession();
  redirect("/login");
}
