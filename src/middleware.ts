import { NextRequest, NextResponse } from "next/server";

// Middleware usa Edge Runtime - não pode fazer chamadas TCP/DB diretas.
// Verificação de cookie é suficiente; a validação real ocorre nas server actions.
// Em produção (HTTPS) o Better Auth prefixa o cookie de sessão com "__Secure-",
// então checamos os dois nomes (sem prefixo em dev/http, com prefixo em prod).
export function middleware(request: NextRequest) {
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ??
    request.cookies.get("__Secure-better-auth.session_token")?.value;
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
  matcher: ["/dashboard/:path*", "/login", "/cadastro"],
};
