import "server-only";

import { db } from "@/lib/db";
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

export function criarConversa(opcoes: {
  usuarioId: number;
  ambiente: Ambiente;
  disciplinaSlug?: string | null;
  titulo: string;
}): number {
  const resultado = db()
    .prepare(
      "INSERT INTO conversas (usuario_id, ambiente, disciplina_slug, titulo) VALUES (?, ?, ?, ?)",
    )
    .run(
      opcoes.usuarioId,
      opcoes.ambiente,
      opcoes.disciplinaSlug ?? null,
      // O título vem da primeira pergunta; cortamos para caber na barra lateral.
      opcoes.titulo.slice(0, 80),
    );
  return Number(resultado.lastInsertRowid);
}

export function conversaPertenceAo(conversaId: number, usuarioId: number): boolean {
  const linha = db()
    .prepare("SELECT 1 AS ok FROM conversas WHERE id = ? AND usuario_id = ?")
    .get(conversaId, usuarioId);
  return Boolean(linha);
}

export function registrarMensagem(opcoes: {
  conversaId: number;
  papel: "user" | "assistant";
  conteudo: string;
  nivel?: string | null;
  auditoria?: AuditoriaDeCitacoes | null;
}): number {
  const resultado = db()
    .prepare(
      "INSERT INTO mensagens (conversa_id, papel, conteudo, nivel, auditoria_json) VALUES (?, ?, ?, ?, ?)",
    )
    .run(
      opcoes.conversaId,
      opcoes.papel,
      opcoes.conteudo,
      opcoes.nivel ?? null,
      opcoes.auditoria ? JSON.stringify(opcoes.auditoria) : null,
    );
  return Number(resultado.lastInsertRowid);
}

export function mensagensDaConversa(conversaId: number): Mensagem[] {
  const linhas = db()
    .prepare(
      "SELECT id, papel, conteudo, nivel, auditoria_json, criado_em FROM mensagens WHERE conversa_id = ? ORDER BY id",
    )
    .all(conversaId) as Array<{
    id: number;
    papel: "user" | "assistant";
    conteudo: string;
    nivel: string | null;
    auditoria_json: string | null;
    criado_em: string;
  }>;

  return linhas.map((l) => ({
    id: l.id,
    papel: l.papel,
    conteudo: l.conteudo,
    nivel: l.nivel,
    auditoria: l.auditoria_json ? (JSON.parse(l.auditoria_json) as AuditoriaDeCitacoes) : null,
    criado_em: l.criado_em,
  }));
}

export function conversasDoUsuario(
  usuarioId: number,
  ambiente: Ambiente,
  limite = 25,
) {
  return db()
    .prepare(
      `SELECT id, titulo, disciplina_slug, criado_em
         FROM conversas WHERE usuario_id = ? AND ambiente = ?
        ORDER BY id DESC LIMIT ?`,
    )
    .all(usuarioId, ambiente, limite) as Array<{
    id: number;
    titulo: string;
    disciplina_slug: string | null;
    criado_em: string;
  }>;
}

/** Últimos turnos, para dar memória curta ao modelo sem estourar o contexto. */
export function historicoParaModelo(conversaId: number, maxTurnos = 12) {
  return mensagensDaConversa(conversaId)
    .slice(-maxTurnos)
    .map((m) => ({ papel: m.papel, conteudo: m.conteudo }));
}
