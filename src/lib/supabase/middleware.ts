import { NextResponse, type NextRequest } from "next/server";

function getMockUser(request: NextRequest) {
  const session = request.cookies.get("aicomply_session");
  if (!session) return null;
  try {
    return JSON.parse(session.value);
  } catch {
    return null;
  }
}

export function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });

  const mockUser = getMockUser(request);
  const { pathname } = request.nextUrl;
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/verify");
  const isDashboard = pathname.startsWith("/dashboard");

  if (!mockUser && isDashboard) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (mockUser && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
