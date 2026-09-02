import type { Metadata } from "next";
import { criarContaAction } from "../acoes";
import { FormularioDeAcesso } from "../FormularioDeAcesso";

export const metadata: Metadata = { title: "Criar conta" };

export default function PaginaCriarConta() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Criar sua conta</h1>
      <p className="mb-8 mt-1.5 text-sm text-[var(--color-texto-suave)]">
        No próximo passo você informa seu período e a plataforma monta sua grade.
      </p>
      <FormularioDeAcesso modo="criar" acao={criarContaAction} />
    </>
  );
}
