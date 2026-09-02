import "server-only";

import { db } from "@/lib/db";
import { gerarEstruturado } from "@/lib/ia/cliente";
import { promptPlanoDeEstudos } from "@/lib/ia/prompts";
import { PlanoDeEstudosSchema, type PlanoDeEstudos } from "@/lib/ia/schemas";
import { desempenhoDoAluno } from "./desempenho";

export async function gerarPlanoDeEstudos(opcoes: {
  usuarioId: number;
  nomeAluno: string;
  periodo: number;
  objetivo: string;
}): Promise<PlanoDeEstudos> {
  const desempenho = desempenhoDoAluno(opcoes.usuarioId).map((d) => ({
    disciplina: d.nome,
    acertos: d.acertos,
    total: d.total,
    percentual: d.percentual,
  }));

  const plano = await gerarEstruturado({
    sistema: promptPlanoDeEstudos({
      nomeAluno: opcoes.nomeAluno,
      periodo: opcoes.periodo,
      objetivo: opcoes.objetivo,
      desempenho,
    }),
    turnos: [{ papel: "user", conteudo: "Monte meu plano de estudos para as próximas semanas." }],
    schema: PlanoDeEstudosSchema,
    nomeFerramenta: "entregar_plano",
    descricaoFerramenta: "Entrega o plano de estudos personalizado.",
    maxTokens: 4096,
    temperatura: 0.5,
  });

  db()
    .prepare("INSERT INTO planos_estudo (usuario_id, conteudo_json) VALUES (?, ?)")
    .run(opcoes.usuarioId, JSON.stringify(plano));

  return plano;
}

export function planoMaisRecente(
  usuarioId: number,
): { plano: PlanoDeEstudos; criado_em: string } | null {
  const linha = db()
    .prepare(
      "SELECT conteudo_json, criado_em FROM planos_estudo WHERE usuario_id = ? ORDER BY id DESC LIMIT 1",
    )
    .get(usuarioId) as { conteudo_json: string; criado_em: string } | undefined;
  if (!linha) return null;
  return {
    plano: JSON.parse(linha.conteudo_json) as PlanoDeEstudos,
    criado_em: linha.criado_em,
  };
}
