import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { disciplinasMatriculadas, exigirUsuario, perfilDoEstudante } from "@/lib/auth";
import { disciplinasDoPeriodo } from "@/lib/curriculo";
import { salvarOnboarding } from "./acoes";
import { FormularioDeOnboarding } from "./FormularioDeOnboarding";

/**
 * Sempre dinâmica: esta rota depende da sessão.
 *
 * Sem isso o Next a pré-renderiza quando o build roda sem as variáveis do
 * Supabase — porque aí a leitura de sessão nem chega a tocar nos cookies — e o
 * resultado é uma página congelada em "deslogado" para todo mundo. A garantia
 * não pode depender de a configuração estar presente na hora do build.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Montar sua grade" };

export default async function PaginaOnboarding() {
  const usuario = await exigirUsuario();
  const perfil = await perfilDoEstudante();
  const matriculadas = await disciplinasMatriculadas();
  const periodo = perfil?.periodo ?? 1;

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <Link href="/" className="mb-8 inline-block">
        <Logo />
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
