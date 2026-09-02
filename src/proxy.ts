import type { NextRequest } from "next/server";
import { renovarSessao } from "@/lib/supabase/proxy";

/**
 * Roda antes de toda página e renova a sessão do Supabase.
 *
 * No Next 16 este arquivo se chama `proxy` — é o sucessor do `middleware`.
 */
export default async function proxy(requisicao: NextRequest) {
  return renovarSessao(requisicao);
}

export const config = {
  matcher: [
    // Tudo, menos estáticos e imagens — que não têm sessão para renovar.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
