import type { Metadata } from "next";
import Link from "next/link";
import { disciplinasMatriculadas, exigirUsuario, perfilDoEstudante } from "@/lib/auth";
import { disciplinaPorSlug } from "@/lib/curriculo";
import { desempenhoDoAluno, pontoMaisFraco } from "@/lib/servicos/desempenho";
import { simuladosRecentes } from "@/lib/servicos/questoes";
import { planoMaisRecente } from "@/lib/servicos/plano";
import { BarraDeDesempenho } from "@/components/BarraDeDesempenho";

export const metadata: Metadata = { title: "Painel do estudante" };

export default async function PainelEstudante() {
  const usuario = await exigirUsuario();
  // O layout já garantiu que o perfil existe antes de renderizar esta página.
  const perfil = (await perfilDoEstudante())!;
  const [slugs, desempenho, recentes, plano] = await Promise.all([
    disciplinasMatriculadas(),
    desempenhoDoAluno(),
    simuladosRecentes(5),
    planoMaisRecente(),
  ]);
  const disciplinas = slugs.map(disciplinaPorSlug).filter((d) => d !== undefined);
  const fraco = pontoMaisFraco(desempenho);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          Olá, {usuario.nome.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
          {perfil.periodo}º período
          {perfil.faculdade ? ` · ${perfil.faculdade}` : ""}
          {perfil.objetivo ? ` · ${perfil.objetivo}` : ""}
        </p>
      </header>

      {fraco && (
        <section className="cartao border-[var(--color-ouro-fraco)] bg-[var(--color-ouro)]/5">
          <h2 className="text-sm font-semibold text-[var(--color-ouro)]">
            Recomendação da plataforma
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-texto-suave)]">
            Você está com <strong className="text-[var(--color-texto)]">{fraco.percentual}%</strong>{" "}
            em <strong className="text-[var(--color-texto)]">{fraco.nome}</strong> — é onde seu
            desempenho está mais baixo. Vale revisar a matéria com o Professor IA antes de responder
            mais questões.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/estudante/professor?disciplina=${fraco.slug}`} className="botao py-2! text-xs!">
              Estudar com o Professor IA
            </Link>
            <Link href="/estudante/plano" className="botao-secundario py-2! text-xs!">
              Ver plano de estudos
            </Link>
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="titulo-secao">Seu desempenho</h2>
            <Link href="/estudante/questoes" className="text-xs text-[var(--color-acento)] hover:underline">
              Treinar questões
            </Link>
          </div>

          {desempenho.length === 0 ? (
            <div className="cartao">
              <p className="text-sm text-[var(--color-texto-suave)]">
                Ainda não há medição. Responda um simulado e a plataforma passa a mostrar seu nível
                por disciplina — é esse dado que alimenta as recomendações e o plano de estudos.
              </p>
              <Link href="/estudante/questoes" className="botao mt-4 py-2! text-xs!">
                Fazer o primeiro simulado
              </Link>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {desempenho.map((d) => (
                <li key={d.slug} className="cartao p-4!">
                  <BarraDeDesempenho desempenho={d} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="titulo-secao mb-3">Plano de estudos</h2>
          {plano ? (
            <div className="cartao">
              <p className="text-xs text-[var(--color-texto-fraco)]">
                Gerado em {plano.criado_em}
              </p>
              <p className="mt-2 text-sm font-medium">🎯 {plano.plano.focoPrincipal}</p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--color-texto-suave)]">
                {plano.plano.metaDaSemana}
              </p>
              <Link href="/estudante/plano" className="botao-secundario mt-4 py-2! text-xs!">
                Abrir plano
              </Link>
            </div>
          ) : (
            <div className="cartao">
              <p className="text-sm text-[var(--color-texto-suave)]">
                Nenhum plano gerado ainda.
              </p>
              <Link href="/estudante/plano" className="botao mt-4 py-2! text-xs!">
                Gerar meu plano
              </Link>
            </div>
          )}

          {recentes.length > 0 && (
            <>
              <h2 className="titulo-secao mb-3 mt-8">Últimos simulados</h2>
              <ul className="space-y-2">
                {recentes.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/estudante/questoes/${s.id}`}
                      className="cartao-interativo block p-3.5!"
                    >
                      <p className="text-xs font-medium">
                        {disciplinaPorSlug(s.disciplina_slug)?.nome ?? s.disciplina_slug}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--color-texto-fraco)]">
                        {s.finalizado_em
                          ? `${s.acertos}/${s.total} acertos`
                          : `${s.total} questões · não finalizado`}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="titulo-secao">Suas disciplinas</h2>
          <Link href="/onboarding" className="text-xs text-[var(--color-acento)] hover:underline">
            Ajustar grade
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {disciplinas.map((d) => (
            <li key={d.slug}>
              <Link href={`/estudante/disciplinas/${d.slug}`} className="cartao-interativo block h-full">
                <h3 className="text-sm font-semibold">
                  <span className="mr-2">{d.emoji}</span>
                  {d.nome}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-texto-suave)]">
                  {d.ementa}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
