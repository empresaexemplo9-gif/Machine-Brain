import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { disciplinaPorSlug } from "@/lib/curriculo";
import { buscarFontePorId, type Fonte } from "@/lib/fontes";
import { carregarSimulado } from "@/lib/servicos/questoes";
import { corrigirSimuladoAction } from "../acoes";
import { Simulado } from "./Simulado";

export const metadata: Metadata = { title: "Simulado" };

export default async function PaginaDoSimulado({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  const numero = Number(id);
  if (!Number.isInteger(numero)) notFound();

  const simulado = carregarSimulado(numero, usuario.id);
  if (!simulado) notFound();

  const disciplina = disciplinaPorSlug(simulado.disciplina_slug);

  // Resolve os IDs citados nas questões para o texto integral da fonte.
  const fontesPorId: Record<string, Fonte> = {};
  for (const questao of simulado.questoes) {
    for (const fid of questao.fontes) {
      const fonte = buscarFontePorId(fid);
      if (fonte) fontesPorId[fid] = fonte;
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-xs text-[var(--color-texto-fraco)]">
          <Link href="/estudante/questoes" className="hover:text-[var(--color-texto)]">
            Questões
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {disciplina?.emoji ?? "📝"} {disciplina?.nome ?? simulado.disciplina_slug}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
          {simulado.questoes.length} questões · {simulado.estilo} · {simulado.dificuldade}
          {simulado.tema ? ` · ${simulado.tema}` : ""}
        </p>
      </header>

      <Simulado
        simuladoId={simulado.id}
        questoes={simulado.questoes}
        respostasSalvas={simulado.respostas}
        fontesPorId={fontesPorId}
        corrigir={corrigirSimuladoAction}
        disciplinaSlug={simulado.disciplina_slug}
      />
    </div>
  );
}
