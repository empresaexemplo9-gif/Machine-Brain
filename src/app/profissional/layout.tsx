import { Cabecalho } from "@/components/Cabecalho";
import { exigirUsuario } from "@/lib/auth";

export default async function LayoutProfissional({ children }: { children: React.ReactNode }) {
  // O ambiente profissional não exige onboarding de estudante: um advogado pode
  // criar a conta e ir direto para cá.
  const usuario = await exigirUsuario();

  return (
    <>
      <Cabecalho usuario={usuario} ambiente="profissional" />
      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
    </>
  );
}
