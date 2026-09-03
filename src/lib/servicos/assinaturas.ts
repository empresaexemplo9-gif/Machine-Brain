import "server-only";

import { supabaseServidor } from "@/lib/supabase/servidor";
import { usuarioAtual } from "@/lib/auth";

/**
 * Leitura das assinaturas do próprio usuário.
 *
 * Escrita não mora aqui: conceder período é ato de quem confirmou o dinheiro,
 * e o banco recusa a escrita vinda da sessão do beneficiado (ver a migração
 * 20260903140000_assinaturas.sql).
 */

export interface Assinatura {
  id: number;
  valorCentavos: number;
  dias: number;
  expiraEm: Date;
  criadoEm: Date;
}

export async function assinaturaAtiva(): Promise<Assinatura | null> {
  const usuario = await usuarioAtual();
  if (!usuario) return null;

  const supabase = await supabaseServidor();
  const { data } = await supabase
    .from("assinaturas")
    .select("id, valor_centavos, dias, expira_em, criado_em")
    .gt("expira_em", new Date().toISOString())
    .order("expira_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id as number,
    valorCentavos: data.valor_centavos as number,
    dias: data.dias as number,
    expiraEm: new Date(data.expira_em as string),
    criadoEm: new Date(data.criado_em as string),
  };
}
