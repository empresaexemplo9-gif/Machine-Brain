import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { disciplinaPorSlug } from "@/lib/curriculo";
import { fontesPorArea } from "@/lib/fontes";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const disciplina = disciplinaPorSlug(slug);
  return { title: disciplina?.nome ?? "Disciplina" };
}

export default async function PaginaDaDisciplina({ params }: Props) {
  const { slug } = await params;
  const disciplina = disciplinaPorSlug(slug);
  if (!disciplina) notFound();

  // Legislação do catálogo verificado pertinente às áreas desta disciplina.
  // O teto por área é generoso de propósito: esta é a biblioteca da matéria, e
  // cortar cedo esconderia justamente os dispositivos mais cobrados.
  const fontes = disciplina.areas.flatMap((area) => fontesPorArea(area, 40));
  const unicas = [...new Map(fontes.map((f) => [f.id, f])).values()];

  return (
    <div className="space-y-10">
      <header>
        <p className="text-xs text-[var(--color-texto-fraco)]">
          <Link href="/estudante/disciplinas" className="hover:text-[var(--color-texto)]">
            Disciplinas
          </Link>{" "}
          · {disciplina.periodo}º período
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          <span className="mr-2">{disciplina.emoji}</span>
          {disciplina.nome}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-texto-suave)]">
          {disciplina.ementa}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`/estudante/professor?disciplina=${disciplina.slug}`} className="botao py-2! text-xs!">
            👨‍🏫 Perguntar ao Professor IA
          </Link>
          <Link href={`/estudante/questoes?disciplina=${disciplina.slug}`} className="botao-secundario py-2! text-xs!">
            📝 Gerar questões
          </Link>
        </div>
      </header>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h2 className="titulo-secao mb-3">Temas da disciplina</h2>
          <ul className="space-y-2">
            {disciplina.temas.map((tema) => (
              <li key={tema} className="cartao p-3.5!">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm">{tema}</span>
                  <Link
                    href={`/estudante/professor?disciplina=${disciplina.slug}&pergunta=${encodeURIComponent(
                      `Me explique ${tema} em ${disciplina.nome}.`,
                    )}`}
                    className="shrink-0 text-xs text-[var(--color-acento)] hover:underline"
                  >
                    Estudar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="titulo-secao mb-1.5">Legislação da disciplina</h2>
          <p className="mb-3 text-xs text-[var(--color-texto-fraco)]">
            Dispositivos do catálogo verificado, transcritos de fonte oficial.
          </p>
          {unicas.length === 0 ? (
            <p className="cartao text-xs text-[var(--color-texto-fraco)]">
              O catálogo verificado ainda não cobre esta disciplina. O Professor IA continua
              disponível, mas vai avisar quando não tiver o texto legal em mãos.
            </p>
          ) : (
            <ul className="space-y-2">
              {unicas.map((fonte) => (
                <li key={fonte.id}>
                  <a
                    href={fonte.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cartao-interativo block p-3.5!"
                  >
                    <p className="text-xs font-semibold text-[var(--color-ouro)]">
                      {fonte.siglaNorma} — {fonte.dispositivo}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-texto-suave)]">{fonte.ementa}</p>
                    <p className="mt-1.5 line-clamp-2 text-[0.7rem] leading-snug text-[var(--color-texto-fraco)]">
                      {fonte.texto}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
