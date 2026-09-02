"use client";

import { useActionState, useState } from "react";
import type { EstadoUpload } from "./acoes";

export function FormularioDeUpload({
  acao,
}: {
  acao: (estado: EstadoUpload, dados: FormData) => Promise<EstadoUpload>;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const [nome, setNome] = useState<string | null>(null);

  return (
    <form action={enviar} className="cartao space-y-5">
      <div>
        <label
          htmlFor="arquivo"
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-borda)] px-6 py-10 text-center transition-colors hover:border-[var(--color-acento)]"
        >
          <span className="text-2xl">📎</span>
          <span className="mt-3 text-sm font-medium">
            {nome ?? "Selecionar arquivo"}
          </span>
          <span className="mt-1 text-xs text-[var(--color-texto-fraco)]">
            PDF, DOCX, TXT ou MD · até 12 MB
          </span>
          <input
            id="arquivo"
            name="arquivo"
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="sr-only"
            onChange={(e) => setNome(e.target.files?.[0]?.name ?? null)}
            required
          />
        </label>
      </div>

      <p className="text-xs leading-relaxed text-[var(--color-texto-fraco)]">
        PDF digitalizado sem camada de texto é recusado com aviso, em vez de gerar uma análise a
        partir de página em branco.
      </p>

      {estado.erro && (
        <p className="rounded-lg border border-[var(--color-vermelho)]/40 bg-[var(--color-vermelho)]/10 px-3 py-2 text-xs text-[var(--color-vermelho)]">
          {estado.erro}
        </p>
      )}

      <button type="submit" className="botao w-full" disabled={pendente}>
        {pendente ? "Extraindo o texto…" : "Enviar documento"}
      </button>
    </form>
  );
}
