"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ErroDeAutenticacao, autenticar, criarConta, perfilDoEstudante } from "@/lib/auth";

export interface EstadoDoFormulario {
  erro?: string;
}

const EsquemaLogin = z.object({
  email: z.string().email("Informe um e-mail válido."),
  senha: z.string().min(1, "Informe sua senha."),
});

const EsquemaCadastro = z.object({
  nome: z.string().min(2, "Informe seu nome."),
  email: z.string().email("Informe um e-mail válido."),
  senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export async function entrarAction(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const validado = EsquemaLogin.safeParse({
    email: dados.get("email"),
    senha: dados.get("senha"),
  });
  if (!validado.success) return { erro: validado.error.issues[0].message };

  let destino = "/estudante";
  try {
    await autenticar(validado.data.email, validado.data.senha);
    // Quem ainda não passou pelo onboarding não tem o que ver no painel.
    if (!(await perfilDoEstudante())) destino = "/onboarding";
  } catch (erro) {
    if (erro instanceof ErroDeAutenticacao) return { erro: erro.message };
    throw erro;
  }

  redirect(destino);
}

export async function criarContaAction(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const validado = EsquemaCadastro.safeParse({
    nome: dados.get("nome"),
    email: dados.get("email"),
    senha: dados.get("senha"),
  });
  if (!validado.success) return { erro: validado.error.issues[0].message };

  try {
    await criarConta(validado.data);
  } catch (erro) {
    // Inclui o caso de "conta criada, confirme o e-mail": não é falha, mas
    // também não é motivo para mandar o usuário a uma área que vai expulsá-lo.
    if (erro instanceof ErroDeAutenticacao) return { erro: erro.message };
    throw erro;
  }

  redirect("/onboarding");
}
