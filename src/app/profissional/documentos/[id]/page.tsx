import { IconeBalanca, IconeProcesso } from "@/components/icones";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { buscarFontePorId, type Fonte } from "@/lib/fontes";
import { carregarDocumento } from "@/lib/servicos/documentos";
import { PainelDeFontes } from "@/components/PainelDeFontes";
import { analisarDocumentoAction } from "../acoes";
import { BotaoAnalisar } from "./BotaoAnalisar";

export const metadata: Metadata = { title: "Documento" };

const GRAVIDADE: Record<string, { classe: string; rotulo: string }> = {
  alta: { classe: "border-[var(--color-vermelho)]/40 bg-[var(--color-vermelho)]/10 text-[var(--color-vermelho)]", rotulo: "alta" },
  media: { classe: "border-[var(--color-ambar)]/40 bg-[var(--color-ambar)]/10 text-[var(--color-ambar)]", rotulo: "média" },
  baixa: { classe: "border-[var(--color-borda-forte)] text-[var(--color-texto-fraco)]", rotulo: "baixa" },
};

export default async function PaginaDoDocumento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirUsuario();
  const { id } = await params;
  const numero = Number(id);
  if (!Number.isInteger(numero)) notFound();

  const documento = await carregarDocumento(numero);
  if (!documento) notFound();

  const analise = documento.analise;
  const fontes: Fonte[] = (analise?.fontes ?? [])
    .map(buscarFontePorId)
    .filter((f): f is Fonte => f !== undefined);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs text-[var(--color-texto-fraco)]">
          <Link href="/profissional/documentos" className="hover:text-[var(--color-texto)]">
            Documentos
          </Link>
        </p>
        <h1 className="mt-2 flex items-center gap-2.5 text-2xl font-bold tracking-tight">
          <IconeProcesso className="shrink-0 text-[var(--color-ouro)]" tamanho={24} />
          {documento.nome_arquivo}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
          {documento.tipo.toUpperCase()} · {documento.caracteres.toLocaleString("pt-BR")} caracteres
          · enviado em {documento.criado_em}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <BotaoAnalisar
            documentoId={documento.id}
            acao={analisarDocumentoAction}
            jaAnalisado={Boolean(analise)}
          />
          <Link
            href={`/profissional/jurista?documento=${documento.id}`}
            className="botao-secundario py-2! text-xs!"
          >
            <IconeBalanca tamanho={16} /> Conversar sobre este documento
          </Link>
        </div>
      </header>

      {!analise ? (
        <section className="cartao">
          <p className="text-sm text-[var(--color-texto-suave)]">
            O texto foi extraído e está guardado. Rode a análise para receber o caso organizado, ou
            vá direto para o Jurista IA e pergunte o que precisa — ele responde com o documento à
            vista nos dois casos.
          </p>
        </section>
      ) : (
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-6">
            <div className="cartao">
              <span className="selo border-[var(--color-borda-forte)] text-[var(--color-texto-fraco)]">
                {analise.tipoDocumento}
              </span>
              <h2 className="titulo-secao mt-4">Resumo do caso</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-texto-suave)]">
                {analise.resumo}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="cartao">
                <h2 className="titulo-secao">Partes</h2>
                {analise.partes.length === 0 ? (
                  <p className="mt-2 text-xs text-[var(--color-texto-fraco)]">
                    Não consta no documento.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {analise.partes.map((p, i) => (
                      <li key={i} className="text-sm">
                        <span className="text-[var(--color-texto-fraco)]">{p.papel}: </span>
                        <span className="text-[var(--color-texto-suave)]">{p.nome}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="cartao">
                <h2 className="titulo-secao">Fase processual</h2>
                <p className="mt-2 text-sm text-[var(--color-texto-suave)]">{analise.faseProcessual}</p>
                <h2 className="titulo-secao mt-4">Objeto</h2>
                <p className="mt-2 text-sm text-[var(--color-texto-suave)]">{analise.objeto}</p>
              </div>
            </div>

            <div className="cartao">
              <h2 className="titulo-secao">Pedidos</h2>
              {analise.pedidos.length === 0 ? (
                <p className="mt-2 text-xs text-[var(--color-texto-fraco)]">Não consta no documento.</p>
              ) : (
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-[var(--color-texto-suave)]">
                  {analise.pedidos.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ol>
              )}
            </div>

            <div className="cartao border-[var(--color-ouro-fraco)] bg-[var(--color-ouro)]/5">
              <h2 className="titulo-secao text-[var(--color-ouro)]">Pontos de atenção</h2>
              {analise.pontosDeAtencao.length === 0 ? (
                <p className="mt-2 text-xs text-[var(--color-texto-fraco)]">
                  Nenhum ponto crítico identificado no texto enviado.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {analise.pontosDeAtencao.map((ponto, i) => {
                    const g = GRAVIDADE[ponto.gravidade] ?? GRAVIDADE.baixa;
                    return (
                      <li key={i}>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold">{ponto.titulo}</h3>
                          <span className={`selo ${g.classe}`}>{g.rotulo}</span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--color-texto-suave)]">
                          {ponto.detalhe}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="cartao">
              <h2 className="titulo-secao">Próximos passos sugeridos</h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-[var(--color-texto-suave)]">
                {analise.proximosPassos.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-[var(--color-texto-fraco)]">
                Sugestões de assistente. A decisão sobre a estratégia e a conferência dos autos
                continuam sendo do advogado responsável.
              </p>
            </div>

            {analise.documentosCitados.length > 0 && (
              <div className="cartao">
                <h2 className="titulo-secao">Documentos citados no texto</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--color-texto-suave)]">
                  {analise.documentosCitados.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <PainelDeFontes fontes={fontes} titulo="Legislação aplicável" />
        </section>
      )}

      <section>
        <h2 className="titulo-secao mb-3">Texto extraído</h2>
        <div className="cartao max-h-96 overflow-y-auto">
          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-[var(--color-texto-fraco)]">
            {documento.texto}
          </pre>
        </div>
      </section>
    </div>
  );
}
