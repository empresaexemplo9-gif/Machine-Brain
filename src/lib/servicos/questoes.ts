import "server-only";

import { db } from "@/lib/db";
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
  usuarioId: number;
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

  const resultado = db()
    .prepare(
      `INSERT INTO simulados (usuario_id, disciplina_slug, estilo, dificuldade, tema, questoes_json, total)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      opcoes.usuarioId,
      opcoes.disciplina.slug,
      opcoes.estilo,
      opcoes.dificuldade,
      opcoes.tema,
      JSON.stringify(questoes),
      questoes.length,
    );

  return Number(resultado.lastInsertRowid);
}

export function carregarSimulado(
  id: number,
  usuarioId: number,
): SimuladoArmazenado | null {
  const linha = db()
    .prepare("SELECT * FROM simulados WHERE id = ? AND usuario_id = ?")
    .get(id, usuarioId) as
    | {
        id: number;
        disciplina_slug: string;
        estilo: string;
        dificuldade: string;
        tema: string;
        questoes_json: string;
        respostas_json: string | null;
        acertos: number | null;
        total: number;
        finalizado_em: string | null;
        criado_em: string;
      }
    | undefined;

  if (!linha) return null;

  return {
    id: linha.id,
    disciplina_slug: linha.disciplina_slug,
    estilo: linha.estilo,
    dificuldade: linha.dificuldade,
    tema: linha.tema,
    questoes: JSON.parse(linha.questoes_json) as Questao[],
    respostas: linha.respostas_json ? (JSON.parse(linha.respostas_json) as number[]) : null,
    acertos: linha.acertos,
    total: linha.total,
    finalizado_em: linha.finalizado_em,
    criado_em: linha.criado_em,
  };
}

export function corrigirSimulado(
  id: number,
  usuarioId: number,
  respostas: number[],
): { acertos: number; total: number } | null {
  const simulado = carregarSimulado(id, usuarioId);
  if (!simulado) return null;

  const acertos = simulado.questoes.reduce(
    (soma, questao, i) => soma + (respostas[i] === questao.correta ? 1 : 0),
    0,
  );

  db()
    .prepare(
      `UPDATE simulados
          SET respostas_json = ?, acertos = ?, finalizado_em = datetime('now')
        WHERE id = ? AND usuario_id = ?`,
    )
    .run(JSON.stringify(respostas), acertos, id, usuarioId);

  return { acertos, total: simulado.questoes.length };
}

export function simuladosRecentes(usuarioId: number, limite = 10) {
  return db()
    .prepare(
      `SELECT id, disciplina_slug, estilo, dificuldade, tema, acertos, total, finalizado_em, criado_em
         FROM simulados WHERE usuario_id = ? ORDER BY id DESC LIMIT ?`,
    )
    .all(usuarioId, limite) as Array<{
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
