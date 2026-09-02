"use client";

import { useEffect, useRef, useState } from "react";
import type { AuditoriaDeCitacoes, Fonte } from "@/lib/fontes";
import { NIVEIS_EXPLICACAO } from "@/lib/curriculo";
import { descreverModo, type ModoIA } from "@/lib/ia/modos";
import { Prosa } from "./Prosa";
import { PainelDeFontes, SeloDeVerificacao } from "./PainelDeFontes";

export interface BolhaInicial {
  papel: "user" | "assistant";
  conteudo: string;
  auditoria: AuditoriaDeCitacoes | null;
}

interface Bolha {
  papel: "user" | "assistant";
  conteudo: string;
  fontes: Fonte[];
  auditoria: AuditoriaDeCitacoes | null;
  escrevendo: boolean;
}

export function Chat({
  ambiente,
  disciplinaSlug,
  disciplinaNome,
  documentoId,
  nivelInicial = "estudante",
  conversaIdInicial = null,
  mensagensIniciais = [],
  sugestoes = [],
  perguntaAutomatica,
  modos = [],
}: {
  ambiente: "estudante" | "profissional";
  disciplinaSlug?: string | null;
  disciplinaNome?: string | null;
  documentoId?: number | null;
  nivelInicial?: string;
  conversaIdInicial?: number | null;
  mensagensIniciais?: BolhaInicial[];
  sugestoes?: string[];
  /** Pergunta disparada sozinha ao abrir, vinda de um link "Estudar este tema". */
  perguntaAutomatica?: string;
  /** Modos de IA com chave configurada, na ordem de preferência do servidor. */
  modos?: ModoIA[];
}) {
  const [bolhas, setBolhas] = useState<Bolha[]>(() =>
    mensagensIniciais.map((m) => ({
      papel: m.papel,
      conteudo: m.conteudo,
      fontes: m.auditoria?.citacoesValidas ?? [],
      auditoria: m.auditoria,
      escrevendo: false,
    })),
  );
  const [texto, setTexto] = useState("");
  const [nivel, setNivel] = useState(nivelInicial);
  const [conversaId, setConversaId] = useState<number | null>(conversaIdInicial);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modo, setModo] = useState<ModoIA | undefined>(modos[0]);

  const fim = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [bolhas]);

  // Uma pergunta vinda da URL dispara uma única vez, mesmo com o remount que o
  // React faz em desenvolvimento.
  const jaDisparou = useRef(false);
  useEffect(() => {
    if (jaDisparou.current || !perguntaAutomatica || mensagensIniciais.length > 0) return;
    jaDisparou.current = true;
    void enviar(perguntaAutomatica);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perguntaAutomatica]);

  async function enviar(mensagem: string, reexplicar = false) {
    const podada = mensagem.trim();
    if (!podada || ocupado) return;

    setErro(null);
    setTexto("");
    setOcupado(true);
    setBolhas((atual) => [
      ...atual,
      { papel: "user", conteudo: podada, fontes: [], auditoria: null, escrevendo: false },
      { papel: "assistant", conteudo: "", fontes: [], auditoria: null, escrevendo: true },
    ]);

    // Atualiza sempre a última bolha, que é a da resposta em construção.
    const atualizarResposta = (mudanca: Partial<Bolha>) =>
      setBolhas((atual) => {
        const copia = [...atual];
        copia[copia.length - 1] = { ...copia[copia.length - 1], ...mudanca };
        return copia;
      });

    try {
      const resposta = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagem: podada,
          conversaId,
          ambiente,
          disciplinaSlug: disciplinaSlug ?? null,
          documentoId: documentoId ?? null,
          nivel,
          reexplicar,
          modo,
        }),
      });

      if (!resposta.ok || !resposta.body) {
        const detalhe = await resposta.json().catch(() => ({ erro: "Falha na comunicação." }));
        throw new Error(detalhe.erro ?? "Falha na comunicação.");
      }

      const leitor = resposta.body.getReader();
      const decodificador = new TextDecoder();
      let sobra = "";
      let acumulado = "";

      // NDJSON: cada linha completa é um evento; a última pode vir partida.
      for (;;) {
        const { value, done } = await leitor.read();
        if (done) break;
        sobra += decodificador.decode(value, { stream: true });
        const linhas = sobra.split("\n");
        sobra = linhas.pop() ?? "";

        for (const linha of linhas) {
          if (!linha.trim()) continue;
          const evento = JSON.parse(linha) as
            | { tipo: "inicio"; conversaId: number }
            | { tipo: "texto"; valor: string }
            | { tipo: "fim"; conversaId: number; fontes: Fonte[]; auditoria: AuditoriaDeCitacoes }
            | { tipo: "erro"; mensagem: string };

          if (evento.tipo === "inicio") {
            setConversaId(evento.conversaId);
          } else if (evento.tipo === "texto") {
            acumulado += evento.valor;
            atualizarResposta({ conteudo: acumulado });
          } else if (evento.tipo === "fim") {
            atualizarResposta({
              fontes: evento.fontes,
              auditoria: evento.auditoria,
              escrevendo: false,
            });
          } else {
            setErro(evento.mensagem);
            atualizarResposta({ escrevendo: false });
          }
        }
      }
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui falar com o servidor.");
      atualizarResposta({ escrevendo: false });
    } finally {
      setOcupado(false);
    }
  }

  const ultimaResposta = [...bolhas].reverse().find((b) => b.papel === "assistant" && !b.escrevendo);
  const podeReexplicar = ambiente === "estudante" && Boolean(ultimaResposta?.conteudo) && !ocupado;

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col">
      {/* Um modo só não é escolha: a régua só aparece quando há o que trocar. */}
      {modos.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="titulo-secao mr-1">Modo</span>
          {modos.map((id) => {
            const m = descreverModo(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => setModo(id)}
                title={`${m.provedor} — ${m.descricao}`}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  modo === id
                    ? "border-[var(--color-ouro)] bg-[var(--color-ouro)]/15 text-[var(--color-ouro)]"
                    : "border-[var(--color-borda)] text-[var(--color-texto-fraco)] hover:border-[var(--color-borda-forte)]"
                }`}
              >
                {m.rotulo}
                <span className="ml-1.5 opacity-60">{m.resumo}</span>
              </button>
            );
          })}
        </div>
      )}

      {ambiente === "estudante" && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="titulo-secao mr-1">Explicar como</span>
          {NIVEIS_EXPLICACAO.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setNivel(n.id)}
              title={n.descricao}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                nivel === n.id
                  ? "border-[var(--color-acento)] bg-[var(--color-acento)]/15 text-[var(--color-acento)]"
                  : "border-[var(--color-borda)] text-[var(--color-texto-fraco)] hover:border-[var(--color-borda-forte)]"
              }`}
            >
              {n.emoji} {n.rotulo}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 space-y-6">
        {bolhas.length === 0 && (
          <div className="cartao">
            <h2 className="text-sm font-semibold">
              {ambiente === "estudante"
                ? `👨‍🏫 Professor IA${disciplinaNome ? ` — ${disciplinaNome}` : ""}`
                : "⚖️ Jurista IA"}
            </h2>
            <p className="mt-1.5 text-sm text-[var(--color-texto-suave)]">
              {ambiente === "estudante"
                ? "Pergunte como perguntaria a um professor. Se a resposta não ficar clara, aperte “Ainda não entendi” e ela vem de outro jeito."
                : "Descreva o caso, cole um trecho ou pergunte por onde começar. Toda afirmação sobre a lei vem com a fonte ao lado."}
            </p>
            {sugestoes.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {sugestoes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void enviar(s)}
                    className="rounded-full border border-[var(--color-borda)] px-3 py-1.5 text-xs text-[var(--color-texto-suave)] transition-colors hover:border-[var(--color-acento)] hover:text-[var(--color-texto)]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {bolhas.map((bolha, i) =>
          bolha.papel === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-[var(--color-acento)]/15 px-4 py-2.5 text-sm text-[var(--color-texto)]">
                {bolha.conteudo}
              </p>
            </div>
          ) : (
            <article key={i} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="min-w-0">
                {bolha.escrevendo && !bolha.conteudo ? (
                  <p className="text-sm text-[var(--color-texto-fraco)]">
                    <span className="cursor-ia">Consultando as fontes e pensando</span>
                  </p>
                ) : (
                  <Prosa
                    texto={bolha.conteudo}
                    fontes={bolha.fontes}
                    className={bolha.escrevendo ? "cursor-ia" : ""}
                  />
                )}
                {!bolha.escrevendo && bolha.auditoria && (
                  <div className="mt-3">
                    <SeloDeVerificacao
                      auditoria={bolha.auditoria}
                      quantidadeFontes={bolha.fontes.length}
                    />
                  </div>
                )}
              </div>
              {!bolha.escrevendo && bolha.auditoria && (
                <PainelDeFontes fontes={bolha.fontes} auditoria={bolha.auditoria} />
              )}
            </article>
          ),
        )}
        <div ref={fim} />
      </div>

      {erro && (
        <p className="mt-4 rounded-lg border border-[var(--color-vermelho)]/40 bg-[var(--color-vermelho)]/10 px-3 py-2 text-xs text-[var(--color-vermelho)]">
          {erro}
        </p>
      )}

      <div className="sticky bottom-0 mt-6 border-t border-[var(--color-borda)] bg-[var(--color-fundo)]/90 py-4 backdrop-blur-md">
        {podeReexplicar && (
          <button
            type="button"
            onClick={() => void enviar("Ainda não entendi. Explica de outro jeito?", true)}
            className="mb-3 rounded-full border border-[var(--color-ouro-fraco)] bg-[var(--color-ouro)]/10 px-3.5 py-1.5 text-xs font-medium text-[var(--color-ouro)] transition-colors hover:bg-[var(--color-ouro)]/20"
          >
            🤔 Ainda não entendi
          </button>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void enviar(texto);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              // Enter envia; Shift+Enter quebra linha, como em qualquer chat.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void enviar(texto);
              }
            }}
            rows={2}
            disabled={ocupado}
            placeholder={
              ambiente === "estudante"
                ? "Professor, não entendi o que é…"
                : "Descreva o caso ou faça sua pergunta…"
            }
            className="campo max-h-40 flex-1 resize-y"
          />
          <button type="submit" className="botao h-[42px]" disabled={ocupado || !texto.trim()}>
            {ocupado ? "…" : "Enviar"}
          </button>
        </form>
      </div>
    </div>
  );
}
