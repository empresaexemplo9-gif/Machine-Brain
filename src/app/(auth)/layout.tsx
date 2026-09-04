import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Fachada } from "@/components/Fachada";
import { IconeBalanca, IconeColuna, IconeSelo } from "@/components/icones";
import { CATALOGO } from "@/lib/fontes";
import { DISCIPLINAS } from "@/lib/curriculo";

/**
 * Acesso em duas colunas.
 *
 * O formulário continua estreito — campo de senha ocupando 2000px não fica
 * melhor, fica pior. O que muda é o resto da tela: em vez de vazio em volta de
 * um cartão, a metade esquerda apresenta a plataforma. É o padrão de tela de
 * acesso de produto, e resolve o "tudo centralizado" sem esticar o que não deve
 * ser esticado.
 *
 * Os números vêm dos dados reais (o catálogo e a grade), não de texto fixo: se
 * o catálogo crescer, a tela cresce junto, e nunca promete o que não existe.
 */

const ARGUMENTOS = [
  {
    Icone: IconeSelo,
    titulo: `${CATALOGO.length} dispositivos verificados`,
    texto:
      "Cada afirmação sobre a lei aponta para o texto oficial, com data de conferência. O que não tem fonte é marcado como não verificado.",
  },
  {
    Icone: IconeColuna,
    titulo: `${DISCIPLINAS.length} disciplinas mapeadas`,
    texto:
      "A grade do seu período, com ementa, temas e a legislação pertinente a cada uma.",
  },
  {
    Icone: IconeBalanca,
    titulo: "Da faculdade ao escritório",
    texto:
      "O mesmo cadastro atravessa a graduação, o Exame de Ordem e a prática profissional.",
  },
];

export default function LayoutDeAcesso({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      {/* Apresentação: some no celular, onde competiria com o formulário. */}
      <section className="relative hidden overflow-hidden border-r border-[var(--color-borda)] bg-[var(--color-superficie)]/40 px-12 py-16 lg:flex lg:flex-col lg:justify-center">
        <Fachada className="pointer-events-none absolute -right-16 bottom-0 h-[420px] w-auto opacity-[0.16]" />

        <div className="relative max-w-xl">
          <h2 className="text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
            Seu professor de Direito e seu assistente jurídico{" "}
            <span className="text-[var(--color-ouro)]">no mesmo lugar</span>.
          </h2>

          <ul className="mt-10 space-y-7">
            {ARGUMENTOS.map((a) => (
              <li key={a.titulo} className="flex gap-4">
                <a.Icone
                  className="mt-0.5 shrink-0 text-[var(--color-ouro)]"
                  tamanho={22}
                />
                <div>
                  <p className="text-sm font-semibold text-[var(--color-texto)]">{a.titulo}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-texto-suave)]">
                    {a.texto}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <main className="flex flex-col justify-center px-5 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-8 inline-block">
            <Logo altura={40} />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
