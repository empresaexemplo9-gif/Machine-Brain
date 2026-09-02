import "server-only";

import { db } from "@/lib/db";
import { buscarFontes, buscarFontePorId } from "@/lib/fontes";
import { gerarEstruturado } from "@/lib/ia/cliente";
import { promptRoteiroDeAtuacao } from "@/lib/ia/prompts";
import { RoteiroSchema, type Roteiro } from "@/lib/ia/schemas";

export const ETAPAS_DO_METODO = [
  "Entender o problema",
  "Identificar a área jurídica",
  "Identificar a legislação aplicável",
  "Pesquisar jurisprudência",
  "Levantar possíveis teses",
  "Analisar documentos",
  "Verificar prazos",
  "Estruturar estratégias",
] as const;

export async function gerarRoteiro(usuarioId: number, caso: string): Promise<number> {
  const fontes = buscarFontes(caso, { limite: 8 });

  const roteiro = await gerarEstruturado({
    sistema: promptRoteiroDeAtuacao(fontes),
    turnos: [
      {
        papel: "user",
        conteudo: `Nunca trabalhei com um caso assim. Monte meu roteiro de atuação.\n\nCaso: ${caso}`,
      },
    ],
    schema: RoteiroSchema,
    nomeFerramenta: "entregar_roteiro",
    descricaoFerramenta: "Entrega o roteiro de atuação em oito etapas.",
    maxTokens: 8192,
    temperatura: 0.4,
  });

  const limpo: Roteiro = {
    ...roteiro,
    etapas: roteiro.etapas
      .map((e) => ({ ...e, fontes: e.fontes.filter((id) => Boolean(buscarFontePorId(id))) }))
      .sort((a, b) => a.numero - b.numero),
  };

  const resultado = db()
    .prepare("INSERT INTO roteiros (usuario_id, caso, etapas_json) VALUES (?, ?, ?)")
    .run(usuarioId, caso, JSON.stringify(limpo));

  return Number(resultado.lastInsertRowid);
}

export function carregarRoteiro(
  id: number,
  usuarioId: number,
): { id: number; caso: string; roteiro: Roteiro; criado_em: string } | null {
  const linha = db()
    .prepare("SELECT id, caso, etapas_json, criado_em FROM roteiros WHERE id = ? AND usuario_id = ?")
    .get(id, usuarioId) as
    | { id: number; caso: string; etapas_json: string; criado_em: string }
    | undefined;
  if (!linha) return null;
  return {
    id: linha.id,
    caso: linha.caso,
    roteiro: JSON.parse(linha.etapas_json) as Roteiro,
    criado_em: linha.criado_em,
  };
}

export function roteirosDoUsuario(usuarioId: number, limite = 20) {
  return db()
    .prepare("SELECT id, caso, criado_em FROM roteiros WHERE usuario_id = ? ORDER BY id DESC LIMIT ?")
    .all(usuarioId, limite) as Array<{ id: number; caso: string; criado_em: string }>;
}
