"use server";

import { revalidatePath } from "next/cache";
import { exigirUsuario, perfilDoEstudante } from "@/lib/auth";
import { ErroDeGeracao } from "@/lib/ia/cliente";
import { gerarPlanoDeEstudos } from "@/lib/servicos/plano";

export interface EstadoPlano {
  erro?: string;
}

export async function gerarPlanoAction(): Promise<EstadoPlano> {
  const usuario = await exigirUsuario();
  const perfil = await perfilDoEstudante();
  if (!perfil) return { erro: "Complete seu perfil antes de gerar o plano." };

  try {
    await gerarPlanoDeEstudos({
      usuarioId: usuario.id,
      nomeAluno: usuario.nome,
      periodo: perfil.periodo,
      objetivo: perfil.objetivo,
    });
  } catch (erro) {
    if (erro instanceof ErroDeGeracao) return { erro: erro.message };
    return { erro: erro instanceof Error ? erro.message : "Não consegui gerar o plano agora." };
  }

  revalidatePath("/estudante/plano");
  revalidatePath("/estudante");
  return {};
}
