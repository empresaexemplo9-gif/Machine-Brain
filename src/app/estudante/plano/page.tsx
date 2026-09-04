import type { Metadata } from "next";
import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { MODO_DEMONSTRACAO } from "@/lib/ia/cliente";
import { desempenhoDoAluno } from "@/lib/servicos/desempenho";
import { planoMaisRecente } from "@/lib/servicos/plano";
import { AvisoDeDemonstracao } from "@/components/AvisoDeDemonstracao";
import { BarraDeDesempenho } from "@/components/BarraDeDesempenho";
import { gerarPlanoAction } from "./acoes";
import { BotaoGerarPlano } from "./BotaoGerarPlano";

export const metadata: Metadata = { title: "Plano de estudos" };

const CORES_PRIORIDADE: Record<string, string> = {
  alta: "border-[var(--color-vermelho)]/40 bg-[var(--color-vermelho)]/10 text-[var(--color-vermelho)]",
  media: "border-[var(--color-ambar)]/40 bg-[var(--color-ambar)]/10 text-[var(--color-ambar)]",
  baixa: "border-[var(--color-borda-forte)] text-[var(--color-texto-fraco)]",
};

export default async function PaginaDoPlano() {
  await exigirUsuario();
  const [desempenho, registro] = await Promise.all([desempenhoDoAluno(), planoMaisRecente()]);

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🎯 Plano de estudos</h1>
          <p className="mt-1 medida text-sm text-[var(--color-texto-suave)]">
            Montado a partir do seu desempenho real nos simulados, não de um cronograma genérico.
          </p>
        </div>
        <BotaoGerarPlano acao={gerarPlanoAction} jaExiste={Boolean(registro)} />
      </header>

      {MODO_DEMONSTRACAO && <AvisoDeDemonstracao />}

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          {!registro ? (
            <div className="cartao">
              <p className="text-sm text-[var(--color-texto-suave)]">
                {desempenho.length === 0
                  ? "Você ainda não respondeu simulados. Dá para gerar um plano de diagnóstico agora — a primeira semana serve justamente para medir onde você está."
                  : "Gere seu plano para transformar o desempenho medido em uma sequência de estudo."}
              </p>
              {desempenho.length === 0 && (
                <Link href="/estudante/questoes" className="botao-secundario mt-4 py-2! text-xs!">
                  Fazer um simulado antes
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="cartao border-[var(--color-ouro-fraco)] bg-[var(--color-ouro)]/5">
                <h2 className="titulo-secao">Diagnóstico</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-texto-suave)]">
                  {registro.plano.diagnostico}
                </p>
                <div className="mt-4 border-t border-[var(--color-ouro-fraco)]/40 pt-4">
                  <p className="text-xs text-[var(--color-texto-fraco)]">Foco principal</p>
                  <p className="mt-0.5 text-sm font-semibold text-[var(--color-ouro)]">
                    {registro.plano.focoPrincipal}
                  </p>
                </div>
              </div>

              <div>
                <h2 className="titulo-secao mb-3">Blocos de estudo</h2>
                <ul className="space-y-3">
                  {registro.plano.blocos.map((bloco, i) => (
                    <li key={i} className="cartao">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold">{bloco.disciplina}</h3>
                        <span
                          className={`selo ${CORES_PRIORIDADE[bloco.prioridade] ?? CORES_PRIORIDADE.baixa}`}
                        >
                          prioridade {bloco.prioridade}
                        </span>
                        <span className="ml-auto text-xs text-[var(--color-texto-fraco)]">
                          {bloco.tempoEstimado}
                        </span>
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-[var(--color-texto-suave)]">
                        {bloco.porQueAgora}
                      </p>

                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--color-texto-suave)]">
                        {bloco.oQueEstudar.map((item, j) => (
                          <li key={j}>{item}</li>
                        ))}
                      </ul>

                      <p className="mt-3 rounded-lg border border-[var(--color-acento)]/30 bg-[var(--color-acento)]/10 px-3 py-2 text-xs text-[var(--color-texto)]">
                        <span className="font-semibold">Ação:</span> {bloco.acao}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="cartao">
                <h2 className="titulo-secao">Meta da semana</h2>
                <p className="mt-2 text-sm text-[var(--color-texto)]">
                  {registro.plano.metaDaSemana}
                </p>
                <p className="mt-3 text-xs text-[var(--color-texto-fraco)]">
                  Plano gerado em {registro.criado_em}. Refaça depois de novos simulados para que
                  ele acompanhe sua evolução.
                </p>
              </div>
            </div>
          )}
        </div>

        <aside>
          <h2 className="titulo-secao mb-3">Base do plano</h2>
          {desempenho.length === 0 ? (
            <p className="cartao text-xs text-[var(--color-texto-fraco)]">
              Sem simulados respondidos, o plano parte do seu período e do seu objetivo.
            </p>
          ) : (
            <ul className="space-y-2">
              {desempenho.map((d) => (
                <li key={d.slug} className="cartao p-3.5!">
                  <BarraDeDesempenho desempenho={d} />
                </li>
              ))}
            </ul>
          )}
        </aside>
      </section>
    </div>
  );
}
