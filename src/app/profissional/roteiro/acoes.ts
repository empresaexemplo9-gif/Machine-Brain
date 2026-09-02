"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirUsuario } from "@/lib/auth";
import { ErroDeGeracao } from "@/lib/ia/cliente";
import { gerarRoteiro } from "@/lib/servicos/roteiro";

export interface EstadoRoteiro {
  erro?: string;
}

const Esquema = z.object({
  caso: z
    .string()
    .min(30, "Descreva o caso com um pouco mais de detalhe — sem contexto o roteiro vira genérico.")
    .max(4000),
});

export async function gerarRoteiroAction(
  _anterior: EstadoRoteiro,
  dados: FormData,
): Promise<EstadoRoteiro> {
  const usuario = await exigirUsuario();

  const validado = Esquema.safeParse({ caso: dados.get("caso") });
  if (!validado.success) return { erro: validado.error.issues[0].message };

  let id: number;
  try {
    id = await gerarRoteiro(usuario.id, validado.data.caso);
  } catch (erro) {
    if (erro instanceof ErroDeGeracao) return { erro: erro.message };
    return { erro: erro instanceof Error ? erro.message : "Não consegui montar o roteiro agora." };
  }

  revalidatePath("/profissional/roteiro");
  redirect(`/profissional/roteiro/${id}`);
}
