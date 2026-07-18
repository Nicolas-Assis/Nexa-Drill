import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Gate de acesso administrativo.
 *
 * Auth é Better Auth (não Supabase Auth). O papel vem do plugin `admin`
 * (coluna "user".role, migration 015) e é exposto em session.user.role.
 * O middleware (Edge) só garante que há cookie de sessão — a checagem de
 * papel acontece aqui, no servidor.
 *
 * NÃO usar "use server": estas funções são utilitárias de servidor
 * (usam headers()/redirect()) e não devem virar server actions expostas.
 */

export type AdminSession = {
  userId: string;
  email: string;
  name: string;
  role: string;
};

export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const role = (session.user as { role?: string | null }).role ?? "user";
  if (role !== "admin") return null;

  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role,
  };
}

/** Para Server Components (layout /admin): redireciona quem não é admin. */
export async function requireAdmin(): Promise<AdminSession> {
  const adminSession = await getAdminSession();
  if (!adminSession) redirect("/dashboard");
  return adminSession;
}

/** Para Server Actions de admin: lança erro tratável (retornado como {error}). */
export async function assertAdmin(): Promise<AdminSession> {
  const adminSession = await getAdminSession();
  if (!adminSession) throw new Error("Não autorizado");
  return adminSession;
}
