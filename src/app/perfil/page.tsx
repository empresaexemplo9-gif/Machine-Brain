import type { Metadata } from "next";
import Link from "next/link";
import { disciplinasMatriculadas, exigirUsuario, perfilDoEstudante } from "@/lib/auth";
import { NIVEIS_EXPLICACAO, disciplinaPorSlug } from "@/lib/curriculo";
import { MODO_DEMONSTRACAO } from "@/lib/ia/cliente";
import { CATALOGO } from "@/lib/fontes";
import { Cabecalho } from "@/components/Cabecalho";

export const metadata: Metadata = { title: "Perfil" };

export default async function PaginaDePerfil() {
  const usuario = await exigirUsuario();
  const perfil = perfilDoEstudante(usuario.id);
  const disciplinas = disciplinasMatriculadas(usuario.id)
    .map(disciplinaPorSlug)
    .filter((d) => d !== undefined);
  const nivel = NIVEIS_EXPLICACAO.find((n) => n.id === perfil?.nivel);

  return (
    <>
      <Cabecalho usuario={usuario} ambiente="estudante" />
      <main className="mx-auto max-w-3xl space-y-8 px-5 py-8">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Seu perfil</h1>
          <p className="mt-1 text-sm text-[var(--color-texto-suave)]">{usuario.email}</p>
        </header>

        <section className="cartao">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="titulo-secao">Perfil de estudante</h2>
            <Link href="/onboarding" className="text-xs text-[var(--color-acento)] hover:underline">
              Editar
            </Link>
          </div>

          {perfil ? (
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-[var(--color-texto-fraco)]">Período</dt>
                <dd className="mt-0.5 text-sm">{perfil.periodo}º</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--color-texto-fraco)]">Faculdade</dt>
                <dd className="mt-0.5 text-sm">{perfil.faculdade || "não informada"}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--color-texto-fraco)]">Objetivo</dt>
                <dd className="mt-0.5 text-sm">{perfil.objetivo || "não informado"}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--color-texto-fraco)]">Nível de explicação</dt>
                <dd className="mt-0.5 text-sm">
                  {nivel ? `${nivel.emoji} ${nivel.rotulo}` : perfil.nivel}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-[var(--color-texto-suave)]">
              Você ainda não montou sua grade.{" "}
              <Link href="/onboarding" className="text-[var(--color-acento)] hover:underline">
                Montar agora
              </Link>
            </p>
          )}
        </section>

        {disciplinas.length > 0 && (
          <section className="cartao">
            <h2 className="titulo-secao">Disciplinas matriculadas</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {disciplinas.map((d) => (
                <li key={d.slug}>
                  <Link
                    href={`/estudante/disciplinas/${d.slug}`}
                    className="inline-flex rounded-lg border border-[var(--color-borda)] px-3 py-1.5 text-xs text-[var(--color-texto-suave)] transition-colors hover:border-[var(--color-borda-forte)]"
                  >
                    {d.emoji} {d.nome}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="cartao">
          <h2 className="titulo-secao">Estado da plataforma</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--color-texto-suave)]">
            <li>
              Catálogo jurídico:{" "}
              <span className="font-medium text-[var(--color-texto)]">
                {CATALOGO.length} dispositivos verificados
              </span>
            </li>
            <li>
              Modelo:{" "}
              <span
                className={
                  MODO_DEMONSTRACAO
                    ? "font-medium text-[var(--color-ambar)]"
                    : "font-medium text-[var(--color-verde)]"
                }
              >
                {MODO_DEMONSTRACAO ? "modo demonstração (sem chave configurada)" : "ativo"}
              </span>
            </li>
            <li>
              Jurisprudência de acórdãos:{" "}
              <span className="font-medium text-[var(--color-texto-fraco)]">
                não conectada — planejada para o V2
              </span>
            </li>
          </ul>
        </section>
      </main>
    </>
  );
}
