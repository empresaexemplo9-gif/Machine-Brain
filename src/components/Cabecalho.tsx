import Link from "next/link";
import { Logo } from "./Logo";
import { IconeBalanca, IconeBirrete } from "./icones";
import { sair } from "@/app/acoes-sessao";
import type { Usuario } from "@/lib/auth";

/**
 * Barra superior com a troca entre os dois ambientes.
 *
 * Estudante e Profissional são um produto só, não dois: o usuário entra na
 * faculdade pelo modo estudante e migra para o profissional sem trocar de
 * conta, de histórico ou de assinatura. A troca fica sempre visível justamente
 * para deixar essa continuidade explícita.
 */
export function Cabecalho({
  usuario,
  ambiente,
}: {
  usuario: Usuario;
  ambiente: "estudante" | "profissional";
}) {
  const links =
    ambiente === "estudante"
      ? [
          { href: "/estudante", rotulo: "Painel" },
          { href: "/estudante/disciplinas", rotulo: "Disciplinas" },
          { href: "/estudante/professor", rotulo: "Professor IA" },
          { href: "/estudante/questoes", rotulo: "Questões" },
          { href: "/estudante/plano", rotulo: "Plano de estudos" },
        ]
      : [
          { href: "/profissional", rotulo: "Painel" },
          { href: "/profissional/jurista", rotulo: "Jurista IA" },
          { href: "/profissional/documentos", rotulo: "Documentos" },
          { href: "/profissional/roteiro", rotulo: "Roteiro de atuação" },
        ];

  const outro = ambiente === "estudante" ? "profissional" : "estudante";

  // O filete dourado sob o cabeçalho é o friso de um papel timbrado. Ele some
  // nas pontas, com gradiente, para marcar a divisa sem virar uma faixa.
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-borda)] bg-[var(--color-fundo)]/85 backdrop-blur-md after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-gradient-to-r after:from-transparent after:via-[var(--color-ouro)]/45 after:to-transparent after:content-['']">
      <div className="flex w-full items-center gap-6 px-5 py-3 sm:px-8 lg:px-12">
        <Link href={`/${ambiente}`} className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-2.5 py-1.5 text-sm text-[var(--color-texto-suave)] transition-colors hover:bg-[var(--color-superficie)] hover:text-[var(--color-texto)]"
            >
              {l.rotulo}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href={`/${outro}`}
            className="hidden rounded-lg border border-[var(--color-borda-forte)] px-3 py-1.5 text-xs font-medium text-[var(--color-texto-suave)] transition-colors hover:border-[var(--color-ouro-fraco)] hover:text-[var(--color-ouro)] sm:inline-flex"
          >
            {outro === "profissional" ? (
              <>
                <IconeBalanca tamanho={15} /> Modo profissional
              </>
            ) : (
              <>
                <IconeBirrete tamanho={15} /> Modo estudante
              </>
            )}
          </Link>
          <Link
            href="/perfil"
            className="hidden text-xs text-[var(--color-texto-fraco)] hover:text-[var(--color-texto)] sm:block"
          >
            {usuario.nome.split(" ")[0]}
          </Link>
          <form action={sair}>
            <button
              type="submit"
              className="rounded-md px-2 py-1.5 text-xs text-[var(--color-texto-fraco)] transition-colors hover:text-[var(--color-vermelho)]"
            >
              Sair
            </button>
          </form>
        </div>
      </div>

      {/* Navegação em telas estreitas. */}
      <nav className="flex gap-1 overflow-x-auto border-t border-[var(--color-borda)] px-5 py-2 md:hidden">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="shrink-0 rounded-md px-2.5 py-1 text-xs text-[var(--color-texto-suave)]"
          >
            {l.rotulo}
          </Link>
        ))}
      </nav>
    </header>
  );
}
