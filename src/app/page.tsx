import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import { CATALOGO } from "@/lib/fontes";
import { DISCIPLINAS } from "@/lib/curriculo";

const JORNADA = [
  { fase: "1º período", texto: "Entra sem saber o que é uma norma jurídica." },
  { fase: "Durante o curso", texto: "Estuda, treina questões e aprende a pensar como advogado." },
  { fase: "Exame de Ordem", texto: "Chega na prova com o diagnóstico do que ainda não domina." },
  { fase: "Advocacia", texto: "Analisa processos, pesquisa e redige com a mesma conta." },
];

const RECURSOS_ESTUDANTE = [
  { emoji: "👨‍🏫", titulo: "Professor IA", texto: "Explica, reexplica de outro jeito quando você não entende, dá exemplo e depois te faz responder." },
  { emoji: "📚", titulo: "Universidade virtual", texto: "A grade do seu período, disciplina por disciplina, com ementa, temas e legislação pertinente." },
  { emoji: "📝", titulo: "Gerador de questões", texto: "Estilo faculdade, OAB ou concurso, na dificuldade que você pedir — com correção comentada." },
  { emoji: "🧠", titulo: "Diagnóstico por disciplina", texto: "A plataforma mede onde você está fraco e monta o plano de estudos a partir disso." },
];

const RECURSOS_PROFISSIONAL = [
  { emoji: "📄", titulo: "Análise de processo", texto: "Envie o PDF: partes, objeto, fase, pedidos e — o que mais importa — os pontos de atenção." },
  { emoji: "🧭", titulo: "Nunca vi esse caso", texto: "Roteiro de atuação em oito etapas, do entendimento do problema à estratégia." },
  { emoji: "✍️", titulo: "Minutas", texto: "Estrutura de peça para revisão, com o que precisa ser conferido antes de protocolar." },
  { emoji: "🔎", titulo: "Fonte antes da opinião", texto: "Cada afirmação normativa aponta para o texto oficial. O que não tem fonte é marcado como tal." },
];

export default async function Inicio() {
  const usuario = await usuarioAtual();
  if (usuario) redirect("/estudante");

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚖️</span>
          <span className="text-sm font-bold tracking-tight">Machine Brain</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/entrar" className="text-sm text-[var(--color-texto-suave)] hover:text-[var(--color-texto)]">
            Entrar
          </Link>
          <Link href="/criar-conta" className="botao py-2! text-xs!">
            Criar conta
          </Link>
        </div>
      </header>

      <section className="pt-14 pb-16">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-ouro-fraco)] bg-[var(--color-ouro)]/5 px-3 py-1 text-xs font-medium text-[var(--color-ouro)]">
          Seu professor de Direito e seu assistente jurídico no mesmo lugar
        </p>
        <h1 className="max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
          A plataforma que acompanha você{" "}
          <span className="text-[var(--color-ouro)]">do primeiro período à advocacia</span>.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--color-texto-suave)]">
          Não é mais uma IA jurídica genérica. É uma faculdade virtual que vira escritório:
          o mesmo cadastro atravessa a graduação, o Exame de Ordem e a prática profissional —
          e toda afirmação sobre a lei vem com a fonte oficial ao lado.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/criar-conta" className="botao">
            Começar agora
          </Link>
          <Link href="/entrar" className="botao-secundario">
            Já tenho conta
          </Link>
        </div>

        <dl className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { n: DISCIPLINAS.length, r: "disciplinas mapeadas" },
            { n: 10, r: "períodos cobertos" },
            { n: CATALOGO.length, r: "dispositivos verificados" },
            { n: 4, r: "níveis de explicação" },
          ].map((e) => (
            <div key={e.r} className="cartao p-4!">
              <dt className="text-2xl font-bold tabular-nums text-[var(--color-ouro)]">{e.n}</dt>
              <dd className="mt-0.5 text-xs text-[var(--color-texto-fraco)]">{e.r}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-t border-[var(--color-borda)] py-14">
        <h2 className="titulo-secao">A jornada</h2>
        <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {JORNADA.map((etapa, i) => (
            <li key={etapa.fase} className="cartao">
              <span className="text-xs font-bold text-[var(--color-acento)]">0{i + 1}</span>
              <h3 className="mt-1.5 text-sm font-semibold">{etapa.fase}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-texto-suave)]">{etapa.texto}</p>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-sm text-[var(--color-texto-fraco)]">
          Um usuário conquistado no 1º período é um cliente por dez anos. É por isso que os dois
          ambientes vivem na mesma conta.
        </p>
      </section>

      <section className="grid gap-10 border-t border-[var(--color-borda)] py-14 lg:grid-cols-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">🎓 Modo estudante</h2>
          <ul className="mt-5 space-y-3">
            {RECURSOS_ESTUDANTE.map((r) => (
              <li key={r.titulo} className="cartao p-4!">
                <h3 className="text-sm font-semibold">
                  <span className="mr-2">{r.emoji}</span>
                  {r.titulo}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-texto-suave)]">{r.texto}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">⚖️ Modo profissional</h2>
          <ul className="mt-5 space-y-3">
            {RECURSOS_PROFISSIONAL.map((r) => (
              <li key={r.titulo} className="cartao p-4!">
                <h3 className="text-sm font-semibold">
                  <span className="mr-2">{r.emoji}</span>
                  {r.titulo}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-texto-suave)]">{r.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-[var(--color-borda)] py-14">
        <div className="cartao border-[var(--color-ouro-fraco)] bg-[var(--color-ouro)]/5">
          <h2 className="text-lg font-bold text-[var(--color-ouro)]">
            A IA não é a fonte. A fonte é a fonte.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--color-texto-suave)]">
            O maior risco de uma ferramenta jurídica com IA é inventar lei com confiança. Aqui o
            modelo só pode citar dispositivos de um catálogo transcrito de fonte oficial, com
            endereço público e data de conferência. Toda resposta passa por uma auditoria
            automática: se ela afirmar &quot;Art. X&quot; sem apontar de onde tirou, a plataforma
            marca esse trecho como <strong>não verificado</strong> na sua frente — em vez de deixar
            passar.
          </p>
          <p className="mt-3 text-xs text-[var(--color-texto-fraco)]">
            Jurisprudência de acórdãos ainda não está indexada. Em vez de inventar número de
            processo e relator, a plataforma diz que a busca precisa ser feita na base do tribunal.
          </p>
        </div>
      </section>

      <footer className="border-t border-[var(--color-borda)] py-8 text-xs text-[var(--color-texto-fraco)]">
        Machine Brain — apoio ao estudo e à prática jurídica. Não substitui a análise de um
        advogado responsável pelo caso.
      </footer>
    </main>
  );
}
