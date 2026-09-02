"use client";

import Link from "next/link";
import { useState } from "react";
import type { Fonte } from "@/lib/fontes";
import type { Questao } from "@/lib/ia/schemas";
import { Prosa } from "@/components/Prosa";

const LETRAS = ["A", "B", "C", "D"];

export function Simulado({
  simuladoId,
  questoes,
  respostasSalvas,
  fontesPorId,
  corrigir,
  disciplinaSlug,
}: {
  simuladoId: number;
  questoes: Questao[];
  respostasSalvas: number[] | null;
  fontesPorId: Record<string, Fonte>;
  corrigir: (
    id: number,
    respostas: number[],
  ) => Promise<{ acertos: number; total: number } | { erro: string }>;
  disciplinaSlug: string;
}) {
  const [respostas, setRespostas] = useState<Array<number | null>>(
    () => respostasSalvas ?? questoes.map(() => null),
  );
  const [corrigido, setCorrigido] = useState(respostasSalvas !== null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const respondidas = respostas.filter((r) => r !== null).length;
  const acertos = questoes.reduce(
    (soma, q, i) => soma + (respostas[i] === q.correta ? 1 : 0),
    0,
  );
  const percentual = Math.round((acertos / Math.max(questoes.length, 1)) * 100);

  async function enviar() {
    if (respondidas < questoes.length) {
      setErro(`Faltam ${questoes.length - respondidas} questões.`);
      return;
    }
    setErro(null);
    setEnviando(true);
    const resultado = await corrigir(simuladoId, respostas as number[]);
    setEnviando(false);
    if ("erro" in resultado) setErro(resultado.erro);
    else setCorrigido(true);
  }

  return (
    <div className="space-y-8">
      {corrigido && (
        <section className="cartao border-[var(--color-ouro-fraco)] bg-[var(--color-ouro)]/5">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p className="text-3xl font-bold tabular-nums text-[var(--color-ouro)]">
              {acertos}/{questoes.length}
            </p>
            <p className="text-lg font-semibold text-[var(--color-texto-suave)]">{percentual}%</p>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-texto-suave)]">
            {percentual >= 75
              ? "Bom domínio do conteúdo. Vale subir a dificuldade no próximo simulado."
              : percentual >= 60
                ? "Base existe, mas ainda escapam pontos importantes. Leia as explicações das que você errou."
                : "Esse conteúdo ainda não está firme. Antes de responder mais questões, revise a matéria com o Professor IA."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/estudante/professor?disciplina=${disciplinaSlug}`}
              className="botao-secundario py-2! text-xs!"
            >
              Revisar com o Professor IA
            </Link>
            <Link href="/estudante/plano" className="botao-secundario py-2! text-xs!">
              Atualizar plano de estudos
            </Link>
          </div>
        </section>
      )}

      <ol className="space-y-6">
        {questoes.map((questao, i) => {
          const marcada = respostas[i];
          const acertou = corrigido && marcada === questao.correta;

          return (
            <li key={i} className="cartao">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--color-texto-fraco)]">
                  QUESTÃO {i + 1}
                </span>
                <span className="rounded bg-[var(--color-superficie-2)] px-2 py-0.5 text-[0.65rem] text-[var(--color-texto-fraco)]">
                  {questao.topico}
                </span>
                {corrigido && (
                  <span
                    className={`ml-auto text-xs font-semibold ${
                      acertou ? "text-[var(--color-verde)]" : "text-[var(--color-vermelho)]"
                    }`}
                  >
                    {acertou ? "✓ acertou" : "✗ errou"}
                  </span>
                )}
              </div>

              <p className="whitespace-pre-wrap text-sm leading-relaxed">{questao.enunciado}</p>

              <div className="mt-4 space-y-2">
                {questao.alternativas.map((alternativa, j) => {
                  const estaMarcada = marcada === j;
                  const ehCorreta = questao.correta === j;

                  let estilo = "border-[var(--color-borda)]";
                  if (corrigido && ehCorreta) {
                    estilo = "border-[var(--color-verde)] bg-[var(--color-verde)]/10";
                  } else if (corrigido && estaMarcada) {
                    estilo = "border-[var(--color-vermelho)] bg-[var(--color-vermelho)]/10";
                  } else if (estaMarcada) {
                    estilo = "border-[var(--color-acento)] bg-[var(--color-acento)]/10";
                  }

                  return (
                    <label
                      key={j}
                      className={`flex gap-3 rounded-lg border p-3 text-sm transition-colors ${estilo} ${
                        corrigido ? "cursor-default" : "cursor-pointer hover:border-[var(--color-borda-forte)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q${i}`}
                        checked={estaMarcada}
                        disabled={corrigido}
                        onChange={() =>
                          setRespostas((atual) => {
                            const copia = [...atual];
                            copia[i] = j;
                            return copia;
                          })
                        }
                        className="sr-only"
                      />
                      <span className="font-bold text-[var(--color-texto-fraco)]">{LETRAS[j]}</span>
                      <span className="text-[var(--color-texto-suave)]">{alternativa}</span>
                    </label>
                  );
                })}
              </div>

              {corrigido && (
                <div className="mt-4 border-t border-[var(--color-borda)] pt-4">
                  <h3 className="titulo-secao mb-2">Por quê</h3>
                  <Prosa
                    texto={questao.explicacao}
                    fontes={questao.fontes.map((f) => fontesPorId[f]).filter(Boolean)}
                  />
                  {questao.fontes.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {questao.fontes.map((fid) => {
                        const fonte = fontesPorId[fid];
                        if (!fonte) return null;
                        return (
                          <li key={fid}>
                            <a
                              href={fonte.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[var(--color-ouro)] hover:underline"
                            >
                              {fonte.siglaNorma} — {fonte.dispositivo}: {fonte.ementa}
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {!corrigido && (
        <div className="sticky bottom-0 border-t border-[var(--color-borda)] bg-[var(--color-fundo)]/90 py-4 backdrop-blur-md">
          {erro && <p className="mb-2 text-xs text-[var(--color-vermelho)]">{erro}</p>}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => void enviar()}
              className="botao"
              disabled={enviando}
            >
              {enviando ? "Corrigindo…" : "Finalizar e corrigir"}
            </button>
            <span className="text-xs text-[var(--color-texto-fraco)]">
              {respondidas} de {questoes.length} respondidas
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
