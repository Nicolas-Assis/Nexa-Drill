import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

// ============================================================
// Heartbeat de atividade — "tempo de permanência" (painel admin)
// ============================================================
// O cliente (ActivityTracker) chama este endpoint a cada ~60s enquanto a aba
// está visível, e também na troca de rota. Acumulamos o tempo ativo em
// activity_sessions: se o último ping foi há menos que IDLE_WINDOW, somamos o
// intervalo à sessão corrente; caso contrário, abrimos uma nova sessão.
// Trocas de rota geram um pageview em activity_logs.
// ============================================================

const IDLE_WINDOW_SECONDS = 120; // gap maior que isso → nova sessão de uso
const MAX_INCREMENT_SECONDS = 90; // teto por ping (protege contra saltos de relógio)

function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let path: string | null = null;
  try {
    const body = (await req.json()) as { path?: string };
    path = typeof body.path === "string" ? body.path.slice(0, 300) : null;
  } catch {
    path = null;
  }

  const supabase = createServiceClient();
  const now = new Date();

  const { data: last } = await supabase
    .from("activity_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("last_seen_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let pathChanged = false;
  let perfuradorId: string | null = last?.perfurador_id ?? null;

  if (last) {
    const gapSeconds = (now.getTime() - new Date(last.last_seen_at).getTime()) / 1000;

    if (gapSeconds <= IDLE_WINDOW_SECONDS) {
      // Mesma sessão de uso: soma o tempo decorrido (com teto).
      pathChanged = !!path && path !== last.current_path;
      const increment = Math.min(Math.max(Math.round(gapSeconds), 0), MAX_INCREMENT_SECONDS);

      await supabase
        .from("activity_sessions")
        .update({
          last_seen_at: now.toISOString(),
          active_seconds: (last.active_seconds ?? 0) + increment,
          page_views: (last.page_views ?? 0) + (pathChanged ? 1 : 0),
          current_path: path ?? last.current_path,
        })
        .eq("id", last.id);

      if (pathChanged) await logPageview(supabase, userId, perfuradorId, path, req);
      return NextResponse.json({ ok: true });
    }
  }

  // Nova sessão de uso (primeiro ping ou após ociosidade).
  if (perfuradorId === null) {
    const { data: perf } = await supabase
      .from("perfuradores")
      .select("id")
      .eq("auth_id", userId)
      .maybeSingle();
    perfuradorId = perf?.id ?? null;
  }

  await supabase.from("activity_sessions").insert({
    user_id: userId,
    perfurador_id: perfuradorId,
    started_at: now.toISOString(),
    last_seen_at: now.toISOString(),
    active_seconds: 0,
    page_views: path ? 1 : 0,
    current_path: path,
    ip: clientIp(req),
    user_agent: req.headers.get("user-agent"),
  });

  if (path) await logPageview(supabase, userId, perfuradorId, path, req);

  return NextResponse.json({ ok: true });
}

async function logPageview(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  perfuradorId: string | null,
  path: string | null,
  req: NextRequest,
) {
  try {
    await supabase.from("activity_logs").insert({
      user_id: userId,
      perfurador_id: perfuradorId,
      event_type: "pageview",
      action: "pageview",
      path,
      ip: clientIp(req),
      user_agent: req.headers.get("user-agent"),
    });
  } catch {
    // best-effort
  }
}
