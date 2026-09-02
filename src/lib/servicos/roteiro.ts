import "server-only";

import { supabaseServidor } from "@/lib/supabase/servidor";
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

export async function gerarRoteiro(usuarioId: string, caso: string): Promise<number> {
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

  const supabase = await supabaseServidor();
  const { data, error } = await supabase
    .from("roteiros")
    .insert({ usuario_id: usuarioId, caso, roteiro: limpo })
    .select("id")
    .single();

  if (error || !data) throw new Error(`Não consegui salvar o roteiro: ${error?.message}`);
  return data.id as number;
}

export async function carregarRoteiro(
  id: number,
): Promise<{ id: number; caso: string; roteiro: Roteiro; criado_em: string } | null> {
  const supabase = await supabaseServidor();
  const { data } = await supabase
    .from("roteiros")
    .select("id, caso, roteiro, criado_em")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id as number,
    caso: data.caso as string,
    roteiro: data.roteiro as Roteiro,
    criado_em: data.criado_em as string,
  };
}

export async function roteirosDoUsuario(limite = 20) {
  const supabase = await supabaseServidor();
  const { data } = await supabase
    .from("roteiros")
    .select("id, caso, criado_em")
    .order("id", { ascending: false })
    .limit(limite);

  return (data ?? []) as Array<{ id: number; caso: string; criado_em: string }>;
}
