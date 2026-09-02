import { redirect } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { exigirUsuario, perfilDoEstudante } from "@/lib/auth";

/**
 * Sempre dinâmica: esta rota depende da sessão.
 *
 * Sem isso o Next a pré-renderiza quando o build roda sem as variáveis do
 * Supabase — porque aí a leitura de sessão nem chega a tocar nos cookies — e o
 * resultado é uma página congelada em "deslogado" para todo mundo. A garantia
 * não pode depender de a configuração estar presente na hora do build.
 */
export const dynamic = "force-dynamic";

export default async function LayoutEstudante({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  // Sem perfil não há grade, nível nem período: o painel não teria o que mostrar.
  if (!(await perfilDoEstudante())) redirect("/onboarding");

  return (
    <>
      <Cabecalho usuario={usuario} ambiente="estudante" />
      <main className="pagina">{children}</main>
    </>
  );
}
