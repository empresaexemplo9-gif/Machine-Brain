import "server-only";

import { supabaseServidor } from "@/lib/supabase/servidor";
import type { AuditoriaDeCitacoes } from "@/lib/fontes";

export type Ambiente = "estudante" | "profissional";

export interface Mensagem {
  id: number;
  papel: "user" | "assistant";
  conteudo: string;
  nivel: string | null;
  auditoria: AuditoriaDeCitacoes | null;
  criado_em: string;
}

export async function criarConversa(opcoes: {
  usuarioId: string;
  ambiente: Ambiente;
  disciplinaSlug?: string | null;
  titulo: string;
}): Promise<number> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase
    .from("conversas")
    .insert({
      usuario_id: opcoes.usuarioId,
      ambiente: opcoes.ambiente,
      disciplina_slug: opcoes.disciplinaSlug ?? null,
      // O título vem da primeira pergunta; cortamos para caber na barra lateral.
      titulo: opcoes.titulo.slice(0, 80),
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(`Não consegui iniciar a conversa: ${error?.message}`);
  return data.id as number;
}

/**
 * O RLS já impede ler conversa alheia, então isto não é a barreira de
 * segurança — é o que separa "não é sua" de "não existe" para a interface.
 */
export async function conversaPertenceAo(conversaId: number): Promise<boolean> {
  const supabase = await supabaseServidor();
  const { data } = await supabase.from("conversas").select("id").eq("id", conversaId).maybeSingle();
  return data !== null;
}

export async function registrarMensagem(opcoes: {
  conversaId: number;
  usuarioId: string;
  papel: "user" | "assistant";
  conteudo: string;
  nivel?: string | null;
  auditoria?: AuditoriaDeCitacoes | null;
}): Promise<void> {
  const supabase = await supabaseServidor();
  const { error } = await supabase.from("mensagens").insert({
    conversa_id: opcoes.conversaId,
    usuario_id: opcoes.usuarioId,
    papel: opcoes.papel,
    conteudo: opcoes.conteudo,
    nivel: opcoes.nivel ?? null,
    auditoria: opcoes.auditoria ?? null,
  });
  if (error) throw new Error(`Não consegui gravar a mensagem: ${error.message}`);
}

export async function mensagensDaConversa(conversaId: number): Promise<Mensagem[]> {
  const supabase = await supabaseServidor();
  const { data } = await supabase
    .from("mensagens")
    .select("id, papel, conteudo, nivel, auditoria, criado_em")
    .eq("conversa_id", conversaId)
    .order("id");

  return (data ?? []).map((l) => ({
    id: l.id as number,
    papel: l.papel as Mensagem["papel"],
    conteudo: l.conteudo as string,
    nivel: (l.nivel as string | null) ?? null,
    auditoria: (l.auditoria as AuditoriaDeCitacoes | null) ?? null,
    criado_em: l.criado_em as string,
  }));
}

export async function conversasDoUsuario(ambiente: Ambiente, limite = 25) {
  const supabase = await supabaseServidor();
  const { data } = await supabase
    .from("conversas")
    .select("id, titulo, disciplina_slug, criado_em")
    .eq("ambiente", ambiente)
    .order("id", { ascending: false })
    .limit(limite);

  return (data ?? []) as Array<{
    id: number;
    titulo: string;
    disciplina_slug: string | null;
    criado_em: string;
  }>;
}

/** Últimos turnos, para dar memória curta ao modelo sem estourar o contexto. */
export async function historicoParaModelo(conversaId: number, maxTurnos = 12) {
  const mensagens = await mensagensDaConversa(conversaId);
  return mensagens.slice(-maxTurnos).map((m) => ({ papel: m.papel, conteudo: m.conteudo }));
}
