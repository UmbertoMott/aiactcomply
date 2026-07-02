import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

// Art. 50 EU AI Act — machine-readable HTTP disclosure headers
// Injected on all /api/* routes that return AI-generated content.
const AI_DISCLOSURE_HEADERS: Record<string, string> = {
  "X-AI-Generated":       "true",
  "X-AI-Platform":        `AIComply/${process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0"}`,
  "X-AI-Regulation":      "EU-AI-Act-2024/1689-Art50",
  "X-AI-Requires-Review": "true",
};

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  // Add AI disclosure headers to all /api/ responses
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const res = response instanceof NextResponse ? response : NextResponse.next();
    Object.entries(AI_DISCLOSURE_HEADERS).forEach(([key, value]) => {
      res.headers.set(key, value);
    });
    return res;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
