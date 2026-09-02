import type { Metadata } from "next";
import Link from "next/link";
import { disciplinasMatriculadas, exigirUsuario, perfilDoEstudante } from "@/lib/auth";
import { DISCIPLINAS, disciplinaPorSlug } from "@/lib/curriculo";

export const metadata: Metadata = { title: "Disciplinas" };

export default async function PaginaDisciplinas() {
  const usuario = await exigirUsuario();
  const perfil = perfilDoEstudante(usuario.id)!;
  const minhas = disciplinasMatriculadas(usuario.id);
  const matriculadas = minhas.map(disciplinaPorSlug).filter((d) => d !== undefined);

  const conjunto = new Set(minhas);
  const outrasPorPeriodo = new Map<number, typeof DISCIPLINAS>();
  for (const d of DISCIPLINAS) {
    if (conjunto.has(d.slug)) continue;
    const lista = outrasPorPeriodo.get(d.periodo) ?? [];
    lista.push(d);
    outrasPorPeriodo.set(d.periodo, lista);
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Sua universidade virtual</h1>
        <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
          As disciplinas do seu {perfil.periodo}º período, e o curso inteiro para quando você quiser
          adiantar ou revisar.
        </p>
      </header>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="titulo-secao">Matriculado</h2>
          <Link href="/onboarding" className="text-xs text-[var(--color-acento)] hover:underline">
            Ajustar grade
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {matriculadas.map((d) => (
            <li key={d.slug}>
              <Link href={`/estudante/disciplinas/${d.slug}`} className="cartao-interativo block h-full">
                <h3 className="text-sm font-semibold">
                  <span className="mr-2">{d.emoji}</span>
                  {d.nome}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-texto-suave)]">
                  {d.ementa}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="titulo-secao mb-3">Curso completo</h2>
        <div className="space-y-6">
          {[...outrasPorPeriodo.entries()]
            .sort(([a], [b]) => a - b)
            .map(([periodo, lista]) => (
              <div key={periodo}>
                <h3 className="mb-2 text-xs font-semibold text-[var(--color-texto-fraco)]">
                  {periodo}º período
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {lista.map((d) => (
                    <li key={d.slug}>
                      <Link
                        href={`/estudante/disciplinas/${d.slug}`}
                        className="inline-flex rounded-lg border border-[var(--color-borda)] px-3 py-1.5 text-xs text-[var(--color-texto-suave)] transition-colors hover:border-[var(--color-borda-forte)] hover:text-[var(--color-texto)]"
                      >
                        {d.emoji} {d.nome}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
