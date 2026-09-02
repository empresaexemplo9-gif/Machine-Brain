import type { Metadata } from "next";
import Link from "next/link";
import { disciplinasMatriculadas, exigirUsuario, perfilDoEstudante } from "@/lib/auth";
import { disciplinasDoPeriodo } from "@/lib/curriculo";
import { salvarOnboarding } from "./acoes";
import { FormularioDeOnboarding } from "./FormularioDeOnboarding";

export const metadata: Metadata = { title: "Montar sua grade" };

export default async function PaginaOnboarding() {
  const usuario = await exigirUsuario();
  const perfil = perfilDoEstudante(usuario.id);
  const matriculadas = disciplinasMatriculadas(usuario.id);
  const periodo = perfil?.periodo ?? 1;

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="text-lg">⚖️</span>
        <span className="text-sm font-bold tracking-tight">Machine Brain</span>
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">
        {perfil ? "Ajustar seu perfil" : `Vamos montar sua grade, ${usuario.nome.split(" ")[0]}`}
      </h1>
      <p className="mb-10 mt-1.5 text-sm text-[var(--color-texto-suave)]">
        Com essas respostas a plataforma monta as disciplinas, calibra o Professor IA e passa a
        recomendar o que estudar.
      </p>

      <FormularioDeOnboarding
        acao={salvarOnboarding}
        inicial={{
          periodo,
          faculdade: perfil?.faculdade ?? "",
          objetivo: perfil?.objetivo ?? "",
          nivel: perfil?.nivel ?? "estudante",
          disciplinas:
            matriculadas.length > 0
              ? matriculadas
              : disciplinasDoPeriodo(periodo).map((d) => d.slug),
          jaConfigurado: matriculadas.length > 0,
        }}
      />
    </main>
  );
}
