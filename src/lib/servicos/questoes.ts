import { planoAtual } from "@/lib/auth";
import "server-only";

import { supabaseServidor } from "@/lib/supabase/servidor";
import { buscarFontes, buscarFontePorId } from "@/lib/fontes";
import type { Disciplina } from "@/lib/curriculo";
import { gerarEstruturado } from "@/lib/ia/cliente";
import { promptGeradorDeQuestoes } from "@/lib/ia/prompts";
import { SimuladoGeradoSchema, type Questao } from "@/lib/ia/schemas";

export interface SimuladoArmazenado {
  id: number;
  disciplina_slug: string;
  estilo: string;
  dificuldade: string;
  tema: string;
  questoes: Questao[];
  respostas: number[] | null;
  acertos: number | null;
  total: number;
  finalizado_em: string | null;
  criado_em: string;
}

export async function gerarSimulado(opcoes: {
  usuarioId: string;
  disciplina: Disciplina;
  tema: string;
  estilo: string;
  dificuldade: string;
  quantidade: number;
}): Promise<number> {
  // A busca combina o tema pedido com a ementa da disciplina, para que uma
  // consulta vaga ("me faça questões") ainda recupere fontes pertinentes.
  const consulta = [opcoes.tema, opcoes.disciplina.nome, opcoes.disciplina.temas.join(" ")]
    .filter(Boolean)
    .join(" ");
  const fontes = buscarFontes(consulta, { limite: 8, areas: opcoes.disciplina.areas });

  const gerado = await gerarEstruturado({
    plano: await planoAtual(),
    sistema: promptGeradorDeQuestoes({
      disciplina: opcoes.disciplina,
      tema: opcoes.tema,
      estilo: opcoes.estilo,
      dificuldade: opcoes.dificuldade,
      quantidade: opcoes.quantidade,
      fontes,
    }),
    turnos: [
      {
        papel: "user",
        conteudo: `Gere ${opcoes.quantidade} questões de ${opcoes.disciplina.nome}${
          opcoes.tema ? `, sobre ${opcoes.tema}` : ""
        }.`,
      },
    ],
    schema: SimuladoGeradoSchema,
    nomeFerramenta: "entregar_questoes",
    descricaoFerramenta: "Entrega as questões geradas no formato exigido pela plataforma.",
    maxTokens: 8192,
    temperatura: 0.7,
  });

  // Citação inventada não chega à tela: IDs fora do catálogo são descartados
  // aqui, e a questão simplesmente aparece sem fonte anexa.
  const questoes = gerado.questoes.map((q) => ({
    ...q,
    fontes: q.fontes.filter((id) => Boolean(buscarFontePorId(id))),
  }));

  const supabase = await supabaseServidor();
  const { data, error } = await supabase
    .from("simulados")
    .insert({
      usuario_id: opcoes.usuarioId,
      disciplina_slug: opcoes.disciplina.slug,
      estilo: opcoes.estilo,
      dificuldade: opcoes.dificuldade,
      tema: opcoes.tema,
      questoes,
      total: questoes.length,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(`Não consegui salvar o simulado: ${error?.message}`);
  return data.id as number;
}

export async function carregarSimulado(id: number): Promise<SimuladoArmazenado | null> {
  const supabase = await supabaseServidor();
  const { data } = await supabase
    .from("simulados")
    .select(
      "id, disciplina_slug, estilo, dificuldade, tema, questoes, respostas, acertos, total, finalizado_em, criado_em",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id as number,
    disciplina_slug: data.disciplina_slug as string,
    estilo: data.estilo as string,
    dificuldade: data.dificuldade as string,
    tema: data.tema as string,
    questoes: data.questoes as Questao[],
    respostas: (data.respostas as number[] | null) ?? null,
    acertos: (data.acertos as number | null) ?? null,
    total: data.total as number,
    finalizado_em: (data.finalizado_em as string | null) ?? null,
    criado_em: data.criado_em as string,
  };
}

export async function corrigirSimulado(
  id: number,
  respostas: number[],
): Promise<{ acertos: number; total: number } | null> {
  const simulado = await carregarSimulado(id);
  if (!simulado) return null;

  const acertos = simulado.questoes.reduce(
    (soma, questao, i) => soma + (respostas[i] === questao.correta ? 1 : 0),
    0,
  );

  const supabase = await supabaseServidor();
  const { error } = await supabase
    .from("simulados")
    .update({ respostas, acertos, finalizado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Não consegui gravar a correção: ${error.message}`);

  return { acertos, total: simulado.questoes.length };
}

export async function simuladosRecentes(limite = 10) {
  const supabase = await supabaseServidor();
  const { data } = await supabase
    .from("simulados")
    .select("id, disciplina_slug, estilo, dificuldade, tema, acertos, total, finalizado_em, criado_em")
    .order("id", { ascending: false })
    .limit(limite);

  return (data ?? []) as Array<{
    id: number;
    disciplina_slug: string;
    estilo: string;
    dificuldade: string;
    tema: string;
    acertos: number | null;
    total: number;
    finalizado_em: string | null;
    criado_em: string;
  }>;
}
