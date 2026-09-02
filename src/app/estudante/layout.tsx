import { redirect } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { exigirUsuario, perfilDoEstudante } from "@/lib/auth";

export default async function LayoutEstudante({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  // Sem perfil não há grade, nível nem período: o painel não teria o que mostrar.
  if (!perfilDoEstudante(usuario.id)) redirect("/onboarding");

  return (
    <>
      <Cabecalho usuario={usuario} ambiente="estudante" />
      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
    </>
  );
}
