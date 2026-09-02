import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { buscarFontePorId, type Fonte } from "@/lib/fontes";
import { carregarRoteiro } from "@/lib/servicos/roteiro";

export const metadata: Metadata = { title: "Roteiro de atuação" };

export default async function PaginaDoRoteiro({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirUsuario();
  const { id } = await params;
  const numero = Number(id);
  if (!Number.isInteger(numero)) notFound();

  const registro = await carregarRoteiro(numero);
  if (!registro) notFound();

  const { roteiro } = registro;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-xs text-[var(--color-texto-fraco)]">
          <Link href="/profissional/roteiro" className="hover:text-[var(--color-texto)]">
            Roteiro de atuação
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">🧭 {roteiro.areaJuridica}</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-texto-suave)]">
          {roteiro.sintese}
        </p>
      </header>

      <section className="cartao">
        <h2 className="titulo-secao">Caso descrito</h2>
        <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-[var(--color-texto-fraco)]">
          {registro.caso}
        </p>
      </section>

      <ol className="space-y-4">
        {roteiro.etapas.map((etapa) => {
          const fontes: Fonte[] = etapa.fontes
            .map(buscarFontePorId)
            .filter((f): f is Fonte => f !== undefined);

          return (
            <li key={etapa.numero} className="cartao">
              <div className="flex items-baseline gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-acento)]/15 text-xs font-bold text-[var(--color-acento)]">
                  {etapa.numero}
                </span>
                <h2 className="text-sm font-semibold">{etapa.titulo}</h2>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-[var(--color-texto-suave)]">
                {etapa.oQueFazer}
              </p>

              <div className="mt-4">
                <h3 className="titulo-secao">Antes de seguir, responda</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--color-texto-suave)]">
                  {etapa.perguntasChave.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>

              {etapa.erroComum && (
                <p className="mt-4 rounded-lg border border-[var(--color-ambar)]/30 bg-[var(--color-ambar)]/10 px-3 py-2 text-xs leading-relaxed text-[var(--color-texto-suave)]">
                  <span className="font-semibold text-[var(--color-ambar)]">Erro comum: </span>
                  {etapa.erroComum}
                </p>
              )}

              {fontes.length > 0 && (
                <ul className="mt-4 space-y-1.5 border-t border-[var(--color-borda)] pt-3">
                  {fontes.map((fonte) => (
                    <li key={fonte.id}>
                      <a
                        href={fonte.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--color-ouro)] hover:underline"
                      >
                        {fonte.siglaNorma} — {fonte.dispositivo}: {fonte.ementa}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      <p className="text-xs leading-relaxed text-[var(--color-texto-fraco)]">
        Roteiro de apoio. Prazos, competência e requisitos processuais precisam ser conferidos no
        texto legal vigente e nos autos antes de qualquer providência.
      </p>
    </div>
  );
}
