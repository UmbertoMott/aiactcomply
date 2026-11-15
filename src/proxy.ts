import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { LOCALE_COOKIE, parseLocalizedPath } from "@/i18n/config";

// Art. 50 EU AI Act — machine-readable HTTP disclosure headers
// Injected on all /api/* routes that return AI-generated content.
const AI_DISCLOSURE_HEADERS: Record<string, string> = {
  "X-AI-Generated":       "true",
  "X-AI-Platform":        `RegulaeOS/${process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0"}`,
  "X-AI-Regulation":      "EU-AI-Act-2024/1689-Art50",
  "X-AI-Requires-Review": "true",
};

// Dominio canonico del sito. In produzione le URL *.vercel.app e l'apex nudo
// (regulaeos.com) vengono reindirizzate qui, così il sito si vede solo su
// www.regulaeos.com. Le anteprime per-PR (VERCEL_ENV=preview) NON sono toccate.
const CANONICAL_HOST = "www.regulaeos.com";

export async function proxy(request: NextRequest) {
  // Redirect al dominio canonico — solo in produzione.
  if (process.env.VERCEL_ENV === "production") {
    const host = request.headers.get("host") ?? "";
    if (host !== CANONICAL_HOST && (host.endsWith(".vercel.app") || host === "regulaeos.com")) {
      const url = request.nextUrl.clone();
      url.hostname = CANONICAL_HOST;
      url.protocol = "https:";
      url.port = "";
      return NextResponse.redirect(url, 308);
    }
  }

  // Lingua nell'URL (sezione Risorse): /risorse/... = italiano, /en/risorse/...
  // = inglese. Le URL /en vengono riscritte internamente sulla stessa pagina;
  // la lingua arriva alle pagine via header e vince sul cookie.
  const localized = parseLocalizedPath(request.nextUrl.pathname);
  let rewriteTo: URL | undefined;
  if (localized?.locale === "en") {
    rewriteTo = request.nextUrl.clone();
    rewriteTo.pathname = localized.basePath;
  }

  const response = await updateSession(request, { locale: localized?.locale, rewriteTo });

  // La lingua dell'URL diventa anche la preferenza dell'utente: chi arriva su un
  // articolo inglese continua a navigare il resto del sito in inglese.
  if (localized && request.cookies.get(LOCALE_COOKIE)?.value !== localized.locale) {
    response.cookies.set(LOCALE_COOKIE, localized.locale, {
      path: "/", maxAge: 31536000, sameSite: "lax",
    });
  }

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
