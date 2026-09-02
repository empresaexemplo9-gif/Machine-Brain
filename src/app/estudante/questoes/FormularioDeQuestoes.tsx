"use client";

import { useActionState, useState } from "react";
import { DIFICULDADES, ESTILOS } from "@/lib/opcoes-questoes";
import type { EstadoQuestoes } from "./acoes";

const QUANTIDADES = [5, 10, 20, 30];

export function FormularioDeQuestoes({
  acao,
  disciplinas,
  disciplinaInicial,
}: {
  acao: (estado: EstadoQuestoes, dados: FormData) => Promise<EstadoQuestoes>;
  disciplinas: Array<{ slug: string; nome: string; emoji: string; minha: boolean }>;
  disciplinaInicial: string;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const [quantidade, setQuantidade] = useState(10);

  const minhas = disciplinas.filter((d) => d.minha);
  const outras = disciplinas.filter((d) => !d.minha);

  return (
    <form action={enviar} className="cartao space-y-6">
      <div>
        <label className="rotulo" htmlFor="disciplina">
          Disciplina
        </label>
        <select id="disciplina" name="disciplina" className="campo" defaultValue={disciplinaInicial}>
          {minhas.length > 0 && (
            <optgroup label="Suas disciplinas">
              {minhas.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.emoji} {d.nome}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Outras disciplinas">
            {outras.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.emoji} {d.nome}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div>
        <label className="rotulo" htmlFor="tema">
          Tema <span className="normal-case text-[var(--color-texto-fraco)]">(opcional)</span>
        </label>
        <input
          id="tema"
          name="tema"
          className="campo"
          placeholder="Ex.: controle de constitucionalidade"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="rotulo">Estilo</span>
          <div className="flex flex-wrap gap-2">
            {ESTILOS.map((e, i) => (
              <label
                key={e.id}
                className="cursor-pointer rounded-lg border border-[var(--color-borda)] px-3 py-1.5 text-xs transition-colors has-[:checked]:border-[var(--color-acento)] has-[:checked]:bg-[var(--color-acento)]/10"
              >
                <input type="radio" name="estilo" value={e.id} defaultChecked={i === 0} className="sr-only" />
                {e.rotulo}
              </label>
            ))}
          </div>
        </div>

        <div>
          <span className="rotulo">Dificuldade</span>
          <div className="flex flex-wrap gap-2">
            {DIFICULDADES.map((d, i) => (
              <label
                key={d.id}
                className="cursor-pointer rounded-lg border border-[var(--color-borda)] px-3 py-1.5 text-xs transition-colors has-[:checked]:border-[var(--color-acento)] has-[:checked]:bg-[var(--color-acento)]/10"
              >
                <input type="radio" name="dificuldade" value={d.id} defaultChecked={i === 1} className="sr-only" />
                {d.rotulo}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div>
        <span className="rotulo">Quantidade de questões</span>
        <div className="flex gap-2">
          {QUANTIDADES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuantidade(q)}
              className={`h-9 w-12 rounded-lg border text-xs font-semibold transition-colors ${
                quantidade === q
                  ? "border-[var(--color-acento)] bg-[var(--color-acento)]/15 text-[var(--color-acento)]"
                  : "border-[var(--color-borda)] text-[var(--color-texto-suave)]"
              }`}
            >
              {q}
            </button>
          ))}
        </div>
        <input type="hidden" name="quantidade" value={quantidade} />
      </div>

      {estado.erro && (
        <p className="rounded-lg border border-[var(--color-vermelho)]/40 bg-[var(--color-vermelho)]/10 px-3 py-2 text-xs text-[var(--color-vermelho)]">
          {estado.erro}
        </p>
      )}

      <button type="submit" className="botao w-full" disabled={pendente}>
        {pendente ? `Gerando ${quantidade} questões…` : "Gerar questões"}
      </button>
      {pendente && (
        <p className="text-center text-xs text-[var(--color-texto-fraco)]">
          Questão boa leva tempo. Pode demorar até um minuto.
        </p>
      )}
    </form>
  );
}
