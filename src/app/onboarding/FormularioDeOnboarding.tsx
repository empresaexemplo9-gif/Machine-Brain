"use client";

import { useActionState, useState } from "react";
import { DISCIPLINAS, NIVEIS_EXPLICACAO, PERIODOS } from "@/lib/curriculo";
import type { EstadoOnboarding } from "./acoes";

const OBJETIVOS = [
  "Passar nas provas da faculdade",
  "Passar no Exame de Ordem",
  "Passar em concurso público",
  "Aprender a advogar na prática",
];

export function FormularioDeOnboarding({
  acao,
  inicial,
}: {
  acao: (estado: EstadoOnboarding, dados: FormData) => Promise<EstadoOnboarding>;
  inicial: {
    periodo: number;
    faculdade: string;
    objetivo: string;
    nivel: string;
    disciplinas: string[];
    /** true quando o usuário já ajustou a grade antes; impede sobrescrever a escolha dele. */
    jaConfigurado: boolean;
  };
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const [periodo, setPeriodo] = useState(inicial.periodo);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set(inicial.disciplinas));
  const [tocou, setTocou] = useState(inicial.jaConfigurado);

  // Trocar de período repropõe a grade daquele período — a menos que o usuário
  // já tenha ajustado a seleção à mão, caso em que respeitamos a escolha dele.
  function trocarPeriodo(novo: number) {
    setPeriodo(novo);
    if (!tocou) {
      setSelecionadas(new Set(DISCIPLINAS.filter((d) => d.periodo === novo).map((d) => d.slug)));
    }
  }

  function alternar(slug: string) {
    setTocou(true);
    setSelecionadas((atual) => {
      const proxima = new Set(atual);
      if (proxima.has(slug)) proxima.delete(slug);
      else proxima.add(slug);
      return proxima;
    });
  }

  const doPeriodo = DISCIPLINAS.filter((d) => d.periodo === periodo);
  const extras = DISCIPLINAS.filter((d) => d.periodo !== periodo && selecionadas.has(d.slug));

  return (
    <form action={enviar} className="space-y-8">
      <section>
        <h2 className="titulo-secao mb-3">Em que período você está?</h2>
        <div className="flex flex-wrap gap-2">
          {PERIODOS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => trocarPeriodo(p)}
              className={`h-10 w-10 rounded-lg border text-sm font-semibold transition-colors ${
                periodo === p
                  ? "border-[var(--color-acento)] bg-[var(--color-acento)]/15 text-[var(--color-acento)]"
                  : "border-[var(--color-borda)] text-[var(--color-texto-suave)] hover:border-[var(--color-borda-forte)]"
              }`}
            >
              {p}º
            </button>
          ))}
        </div>
        <input type="hidden" name="periodo" value={periodo} />
      </section>

      <section>
        <label className="rotulo" htmlFor="faculdade">
          Faculdade <span className="normal-case text-[var(--color-texto-fraco)]">(opcional)</span>
        </label>
        <input
          id="faculdade"
          name="faculdade"
          className="campo"
          defaultValue={inicial.faculdade}
          placeholder="Ex.: UFG, PUC, Mackenzie…"
        />
      </section>

      <section>
        <h2 className="titulo-secao mb-3">Qual é o seu objetivo agora?</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {OBJETIVOS.map((o) => (
            <label
              key={o}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[var(--color-borda)] px-3.5 py-2.5 text-sm transition-colors has-[:checked]:border-[var(--color-acento)] has-[:checked]:bg-[var(--color-acento)]/10"
            >
              <input
                type="radio"
                name="objetivo"
                value={o}
                defaultChecked={inicial.objetivo ? inicial.objetivo === o : o === OBJETIVOS[0]}
                className="accent-[var(--color-acento)]"
              />
              <span className="text-[var(--color-texto-suave)]">{o}</span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 className="titulo-secao mb-1.5">Como o Professor IA deve falar com você?</h2>
        <p className="mb-3 text-xs text-[var(--color-texto-fraco)]">
          Dá para trocar a qualquer momento durante a conversa.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {NIVEIS_EXPLICACAO.map((n) => (
            <label
              key={n.id}
              className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[var(--color-borda)] p-3 transition-colors has-[:checked]:border-[var(--color-acento)] has-[:checked]:bg-[var(--color-acento)]/10"
            >
              <input
                type="radio"
                name="nivel"
                value={n.id}
                defaultChecked={inicial.nivel === n.id}
                className="mt-0.5 accent-[var(--color-acento)]"
              />
              <span>
                <span className="block text-sm font-medium">
                  {n.emoji} {n.rotulo}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--color-texto-fraco)]">
                  {n.descricao}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 className="titulo-secao mb-1.5">Suas disciplinas</h2>
        <p className="mb-3 text-xs text-[var(--color-texto-fraco)]">
          Esta é a grade típica do {periodo}º período. Cada faculdade monta a sua — desmarque o que
          não bate e marque o que faltou.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[...doPeriodo, ...extras].map((d) => (
            <label
              key={d.slug}
              className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[var(--color-borda)] p-3 transition-colors has-[:checked]:border-[var(--color-ouro-fraco)] has-[:checked]:bg-[var(--color-ouro)]/5"
            >
              <input
                type="checkbox"
                name="disciplinas"
                value={d.slug}
                checked={selecionadas.has(d.slug)}
                onChange={() => alternar(d.slug)}
                className="mt-0.5 accent-[var(--color-ouro)]"
              />
              <span>
                <span className="block text-sm font-medium">
                  {d.emoji} {d.nome}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-[var(--color-texto-fraco)]">
                  {d.ementa}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {estado.erro && (
        <p className="rounded-lg border border-[var(--color-vermelho)]/40 bg-[var(--color-vermelho)]/10 px-3 py-2 text-xs text-[var(--color-vermelho)]">
          {estado.erro}
        </p>
      )}

      <button type="submit" className="botao w-full sm:w-auto" disabled={pendente}>
        {pendente ? "Montando sua grade…" : "Montar minha universidade virtual"}
      </button>
    </form>
  );
}
