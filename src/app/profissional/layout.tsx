import { Cabecalho } from "@/components/Cabecalho";
import { exigirUsuario } from "@/lib/auth";

/**
 * Sempre dinâmica: esta rota depende da sessão.
 *
 * Sem isso o Next a pré-renderiza quando o build roda sem as variáveis do
 * Supabase — porque aí a leitura de sessão nem chega a tocar nos cookies — e o
 * resultado é uma página congelada em "deslogado" para todo mundo. A garantia
 * não pode depender de a configuração estar presente na hora do build.
 */
export const dynamic = "force-dynamic";

export default async function LayoutProfissional({ children }: { children: React.ReactNode }) {
  // O ambiente profissional não exige onboarding de estudante: um advogado pode
  // criar a conta e ir direto para cá.
  const usuario = await exigirUsuario();

  return (
    <>
      <Cabecalho usuario={usuario} ambiente="profissional" />
      <main className="pagina">{children}</main>
    </>
  );
}
