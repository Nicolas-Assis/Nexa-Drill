import { NextRequest, NextResponse } from "next/server";
import { atualizarStatusAtrasadas } from "@/app/dashboard/servicos/actions-parcelas";

// Cron diário: marca parcelas pendentes vencidas como "atrasado".
// Protegida por CRON_SECRET. Agende no Vercel Cron (ou similar) chamando
// GET /api/cron/atualizar-parcelas com header Authorization: Bearer <CRON_SECRET>.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET não configurado no servidor." },
      { status: 500 },
    );
  }

  const header = req.headers.get("authorization");
  const provided =
    header?.replace(/^Bearer\s+/i, "") ??
    req.nextUrl.searchParams.get("secret") ??
    "";

  if (provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await atualizarStatusAtrasadas();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, atualizadas: result.atualizadas });
}
