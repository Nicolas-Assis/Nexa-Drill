import { NextRequest, NextResponse } from "next/server";

// Middleware usa Edge Runtime - não pode fazer chamadas TCP/DB diretas.
// Verificação de cookie é suficiente; a validação real ocorre nas server actions.
export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase() || "";
  if (host === "www.nexadrill.shop") {
    const url = request.nextUrl.clone();
    url.host = "nexadrill.shop";
    url.protocol = "https";
    return NextResponse.redirect(url, 308);
  }

  const sessionToken = request.cookies.get("better-auth.session_token")?.value;
  const isAuthenticated = !!sessionToken;

  const pathname = request.nextUrl.pathname;

  if (!isAuthenticated && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && (pathname === "/login" || pathname === "/cadastro")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
