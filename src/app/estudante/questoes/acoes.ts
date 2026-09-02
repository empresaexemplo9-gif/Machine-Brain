"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirUsuario } from "@/lib/auth";
import { disciplinaPorSlug } from "@/lib/curriculo";
import { ErroDeGeracao } from "@/lib/ia/cliente";
import { corrigirSimulado, gerarSimulado } from "@/lib/servicos/questoes";

export interface EstadoQuestoes {
  erro?: string;
}

const EsquemaGeracao = z.object({
  disciplina: z.string().min(1),
  tema: z.string().max(200).default(""),
  estilo: z.enum(["faculdade", "oab", "concurso"]),
  dificuldade: z.enum(["facil", "media", "dificil"]),
  quantidade: z.coerce.number().int().min(1).max(30),
});

export async function gerarSimuladoAction(
  _anterior: EstadoQuestoes,
  dados: FormData,
): Promise<EstadoQuestoes> {
  const usuario = await exigirUsuario();

  const validado = EsquemaGeracao.safeParse({
    disciplina: dados.get("disciplina"),
    tema: dados.get("tema") ?? "",
    estilo: dados.get("estilo"),
    dificuldade: dados.get("dificuldade"),
    quantidade: dados.get("quantidade"),
  });
  if (!validado.success) return { erro: validado.error.issues[0].message };

  const disciplina = disciplinaPorSlug(validado.data.disciplina);
  if (!disciplina) return { erro: "Disciplina desconhecida." };

  let id: number;
  try {
    id = await gerarSimulado({
      usuarioId: usuario.id,
      disciplina,
      tema: validado.data.tema,
      estilo: validado.data.estilo,
      dificuldade: validado.data.dificuldade,
      quantidade: validado.data.quantidade,
    });
  } catch (erro) {
    if (erro instanceof ErroDeGeracao) return { erro: erro.message };
    return {
      erro: erro instanceof Error ? erro.message : "Não consegui gerar as questões agora.",
    };
  }

  redirect(`/estudante/questoes/${id}`);
}

export async function corrigirSimuladoAction(
  simuladoId: number,
  respostas: number[],
): Promise<{ acertos: number; total: number } | { erro: string }> {
  const usuario = await exigirUsuario();
  const resultado = corrigirSimulado(simuladoId, usuario.id, respostas);
  if (!resultado) return { erro: "Simulado não encontrado." };

  // O desempenho alimenta painel e plano de estudos: ambos precisam refazer.
  revalidatePath("/estudante");
  revalidatePath("/estudante/plano");
  return resultado;
}
