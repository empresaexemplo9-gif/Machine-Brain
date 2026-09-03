import { IconeQuestoes } from "@/components/icones";
import type { Metadata } from "next";
import Link from "next/link";
import { disciplinasMatriculadas, exigirUsuario } from "@/lib/auth";
import { DISCIPLINAS, disciplinaPorSlug } from "@/lib/curriculo";
import { MODO_DEMONSTRACAO } from "@/lib/ia/cliente";
import { simuladosRecentes } from "@/lib/servicos/questoes";
import { AvisoDeDemonstracao } from "@/components/AvisoDeDemonstracao";
import { gerarSimuladoAction } from "./acoes";
import { FormularioDeQuestoes } from "./FormularioDeQuestoes";

export const metadata: Metadata = { title: "Gerador de questões" };

export default async function PaginaQuestoes({
  searchParams,
}: {
  searchParams: Promise<{ disciplina?: string }>;
}) {
  const usuario = await exigirUsuario();
  const params = await searchParams;
  const matriculadas = await disciplinasMatriculadas();

  // O aluno pode treinar qualquer disciplina, mas as dele vêm primeiro.
  const conjunto = new Set(matriculadas);
  const opcoes = [
    ...DISCIPLINAS.filter((d) => conjunto.has(d.slug)),
    ...DISCIPLINAS.filter((d) => !conjunto.has(d.slug)),
  ].map((d) => ({ slug: d.slug, nome: d.nome, emoji: d.emoji, minha: conjunto.has(d.slug) }));

  const recentes = await simuladosRecentes(12);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
          <IconeQuestoes className="text-[var(--color-ouro)]" tamanho={24} /> Gerador de questões
        </h1>
        <p className="mt-1 prosa text-sm text-[var(--color-texto-suave)]">
          Peça quantas questões quiser, no estilo e na dificuldade que você precisa. A correção
          explica por que a certa está certa — e por que a errada mais tentadora te pegou.
        </p>
      </header>

      {MODO_DEMONSTRACAO && <AvisoDeDemonstracao />}

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <FormularioDeQuestoes
          acao={gerarSimuladoAction}
          disciplinas={opcoes}
          disciplinaInicial={params.disciplina ?? opcoes[0]?.slug ?? ""}
        />

        <div>
          <h2 className="titulo-secao mb-3">Seus simulados</h2>
          {recentes.length === 0 ? (
            <p className="cartao text-xs text-[var(--color-texto-fraco)]">
              Nenhum simulado ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentes.map((s) => (
                <li key={s.id}>
                  <Link href={`/estudante/questoes/${s.id}`} className="cartao-interativo block p-3.5!">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-xs font-medium">
                        {disciplinaPorSlug(s.disciplina_slug)?.nome ?? s.disciplina_slug}
                      </p>
                      {s.finalizado_em && (
                        <span className="shrink-0 text-xs font-bold tabular-nums text-[var(--color-ouro)]">
                          {Math.round(((s.acertos ?? 0) / Math.max(s.total, 1)) * 100)}%
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--color-texto-fraco)]">
                      {s.tema || "geral"} · {s.total} questões ·{" "}
                      {s.finalizado_em ? `${s.acertos}/${s.total}` : "não finalizado"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
