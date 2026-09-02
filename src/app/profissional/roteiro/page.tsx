import type { Metadata } from "next";
import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { MODO_DEMONSTRACAO } from "@/lib/ia/cliente";
import { ETAPAS_DO_METODO, roteirosDoUsuario } from "@/lib/servicos/roteiro";
import { AvisoDeDemonstracao } from "@/components/AvisoDeDemonstracao";
import { gerarRoteiroAction } from "./acoes";
import { FormularioDeRoteiro } from "./FormularioDeRoteiro";

export const metadata: Metadata = { title: "Roteiro de atuação" };

export default async function PaginaRoteiro() {
  const usuario = await exigirUsuario();
  const roteiros = await roteirosDoUsuario(20);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">🧭 Nunca vi esse caso</h1>
        <p className="mt-1 prosa text-sm text-[var(--color-texto-suave)]">
          Chegou um tipo de causa que você não domina? Descreva o caso e receba um roteiro de
          atuação: o que fazer primeiro, o que perguntar antes de seguir e onde quem é novo naquilo
          costuma errar.
        </p>
      </header>

      {MODO_DEMONSTRACAO && <AvisoDeDemonstracao />}

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <FormularioDeRoteiro acao={gerarRoteiroAction} />

        <div className="space-y-8">
          <div>
            <h2 className="titulo-secao mb-3">O método</h2>
            <ol className="cartao space-y-2">
              {ETAPAS_DO_METODO.map((etapa, i) => (
                <li key={etapa} className="flex gap-3 text-sm">
                  <span className="w-5 shrink-0 text-xs font-bold text-[var(--color-acento)]">
                    {i + 1}
                  </span>
                  <span className="text-[var(--color-texto-suave)]">{etapa}</span>
                </li>
              ))}
            </ol>
          </div>

          {roteiros.length > 0 && (
            <div>
              <h2 className="titulo-secao mb-3">Seus roteiros</h2>
              <ul className="space-y-2">
                {roteiros.map((r) => (
                  <li key={r.id}>
                    <Link href={`/profissional/roteiro/${r.id}`} className="cartao-interativo block p-3.5!">
                      <p className="line-clamp-2 text-xs">{r.caso}</p>
                      <p className="mt-1 text-xs text-[var(--color-texto-fraco)]">{r.criado_em}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
