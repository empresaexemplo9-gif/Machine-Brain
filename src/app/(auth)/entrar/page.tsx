import type { Metadata } from "next";
import { entrarAction } from "../acoes";
import { FormularioDeAcesso } from "../FormularioDeAcesso";

export const metadata: Metadata = { title: "Entrar" };

export default function PaginaEntrar() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Bem-vindo de volta</h1>
      <p className="mb-8 mt-1.5 text-sm text-[var(--color-texto-suave)]">
        Continue de onde você parou.
      </p>
      <FormularioDeAcesso modo="entrar" acao={entrarAction} />
    </>
  );
}
