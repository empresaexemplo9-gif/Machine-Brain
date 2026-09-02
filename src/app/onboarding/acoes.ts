"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { definirMatriculas, exigirUsuario, salvarPerfilDoEstudante } from "@/lib/auth";
import { disciplinaPorSlug } from "@/lib/curriculo";

export interface EstadoOnboarding {
  erro?: string;
}

const Esquema = z.object({
  periodo: z.coerce.number().int().min(1).max(10),
  faculdade: z.string().max(120).default(""),
  objetivo: z.string().max(400).default(""),
  nivel: z.enum(["leigo", "estudante", "advogado", "especialista"]),
});

export async function salvarOnboarding(
  _anterior: EstadoOnboarding,
  dados: FormData,
): Promise<EstadoOnboarding> {
  const usuario = await exigirUsuario();

  const validado = Esquema.safeParse({
    periodo: dados.get("periodo"),
    faculdade: dados.get("faculdade") ?? "",
    objetivo: dados.get("objetivo") ?? "",
    nivel: dados.get("nivel"),
  });
  if (!validado.success) return { erro: validado.error.issues[0].message };

  // Só aceitamos slugs que existem na grade de referência: o formulário não é
  // fonte de verdade sobre quais disciplinas existem.
  const slugs = dados
    .getAll("disciplinas")
    .map(String)
    .filter((slug) => Boolean(disciplinaPorSlug(slug)));

  if (slugs.length === 0) {
    return { erro: "Selecione ao menos uma disciplina para montar sua grade." };
  }

  await salvarPerfilDoEstudante({
    usuario_id: usuario.id,
    periodo: validado.data.periodo,
    faculdade: validado.data.faculdade,
    objetivo: validado.data.objetivo,
    nivel: validado.data.nivel,
  });
  await definirMatriculas(usuario.id, slugs);

  redirect("/estudante");
}
