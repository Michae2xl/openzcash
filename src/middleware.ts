import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

/**
 * Acesso PÚBLICO por padrão (transparência da comunidade). Só as ROTAS DE ADMIN
 * exigem sessão de admin válida:
 *   - páginas de gestão: /admin, /viewing-keys (tesouros), /projetos, /convites;
 *   - APIs que mutam ou expõem dados sensíveis (viewing keys, overrides, scan...).
 * Todo o resto (ZCG, Incoming, onboarding de terceiro, login) é público.
 *
 * O middleware também carimba `x-pathname` e `x-admin` nos headers da requisição
 * (sempre sobrescrevendo o que o cliente enviar), que o layout e as páginas leem
 * para decidir o que renderizar — sem reverificar a sessão em cada componente.
 */
const ADMIN_PAGES = ["/admin", "/viewing-keys", "/projetos", "/convites"];
const ADMIN_APIS = [
  "/api/overrides",
  "/api/projects",
  "/api/scan",
  "/api/treasuries",
  "/api/zcg/proposals",
  "/api/zcg/disbursements",
  "/api/zcg/meetings",
  "/api/zcg/elections",
  "/api/zcg/links",
  "/api/onboarding/invites",
  "/api/logout",
];

function isAdminRoute(pathname: string): boolean {
  const hit = (p: string) => pathname === p || pathname.startsWith(`${p}/`);
  return ADMIN_PAGES.some(hit) || ADMIN_APIS.some(hit);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdmin = await verifySession(
    req.cookies.get(SESSION_COOKIE)?.value,
    process.env.SESSION_SECRET ?? "",
  );

  const pass = () => {
    const h = new Headers(req.headers);
    h.set("x-pathname", pathname);
    h.set("x-admin", isAdmin ? "1" : "0");
    return NextResponse.next({ request: { headers: h } });
  };

  if (!isAdminRoute(pathname)) return pass();
  if (isAdmin) return pass();

  if (pathname.startsWith("/api/"))
    return new NextResponse("Unauthorized", { status: 401 });

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
