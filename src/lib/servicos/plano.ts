import { planoAtual } from "@/lib/auth";
import "server-only";

import { supabaseServidor } from "@/lib/supabase/servidor";
import { gerarEstruturado } from "@/lib/ia/cliente";
import { promptPlanoDeEstudos } from "@/lib/ia/prompts";
import { PlanoDeEstudosSchema, type PlanoDeEstudos } from "@/lib/ia/schemas";
import { desempenhoDoAluno } from "./desempenho";

export async function gerarPlanoDeEstudos(opcoes: {
  usuarioId: string;
  nomeAluno: string;
  periodo: number;
  objetivo: string;
}): Promise<PlanoDeEstudos> {
  const desempenho = (await desempenhoDoAluno()).map((d) => ({
    disciplina: d.nome,
    acertos: d.acertos,
    total: d.total,
    percentual: d.percentual,
  }));

  const plano = await gerarEstruturado({
    plano: await planoAtual(),
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

  const supabase = await supabaseServidor();
  const { error } = await supabase
    .from("planos_estudo")
    .insert({ usuario_id: opcoes.usuarioId, conteudo: plano });
  if (error) throw new Error(`Não consegui salvar o plano: ${error.message}`);

  return plano;
}

export async function planoMaisRecente(): Promise<{
  plano: PlanoDeEstudos;
  criado_em: string;
} | null> {
  const supabase = await supabaseServidor();
  const { data } = await supabase
    .from("planos_estudo")
    .select("conteudo, criado_em")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { plano: data.conteudo as PlanoDeEstudos, criado_em: data.criado_em as string };
}
