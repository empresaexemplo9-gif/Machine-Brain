"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { EstadoDoFormulario } from "./acoes";

export function FormularioDeAcesso({
  modo,
  acao,
}: {
  modo: "entrar" | "criar";
  acao: (estado: EstadoDoFormulario, dados: FormData) => Promise<EstadoDoFormulario>;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const criando = modo === "criar";

  return (
    <form action={enviar} className="space-y-4">
      {criando && (
        <div>
          <label className="rotulo" htmlFor="nome">
            Nome
          </label>
          <input id="nome" name="nome" className="campo" placeholder="Como quer ser chamado" required />
        </div>
      )}

      <div>
        <label className="rotulo" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="campo"
          placeholder="voce@email.com"
          required
        />
      </div>

      <div>
        <label className="rotulo" htmlFor="senha">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete={criando ? "new-password" : "current-password"}
          className="campo"
          placeholder={criando ? "Mínimo de 8 caracteres" : "Sua senha"}
          required
        />
      </div>

      {estado.erro && (
        <p className="rounded-lg border border-[var(--color-vermelho)]/40 bg-[var(--color-vermelho)]/10 px-3 py-2 text-xs text-[var(--color-vermelho)]">
          {estado.erro}
        </p>
      )}

      <button type="submit" className="botao w-full" disabled={pendente}>
        {pendente ? "Aguarde…" : criando ? "Criar conta" : "Entrar"}
      </button>

      <p className="pt-1 text-center text-xs text-[var(--color-texto-fraco)]">
        {criando ? (
          <>
            Já tem conta?{" "}
            <Link href="/entrar" className="text-[var(--color-acento)] hover:underline">
              Entrar
            </Link>
          </>
        ) : (
          <>
            Ainda não tem conta?{" "}
            <Link href="/criar-conta" className="text-[var(--color-acento)] hover:underline">
              Criar conta
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
