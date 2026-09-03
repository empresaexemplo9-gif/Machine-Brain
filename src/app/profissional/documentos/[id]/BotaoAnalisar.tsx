"use client";

import { IconeSelo } from "@/components/icones";

import { useState, useTransition } from "react";

export function BotaoAnalisar({
  documentoId,
  acao,
  jaAnalisado,
}: {
  documentoId: number;
  acao: (id: number) => Promise<{ erro?: string }>;
  jaAnalisado: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        className={jaAnalisado ? "botao-secundario py-2! text-xs!" : "botao py-2! text-xs!"}
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            setErro(null);
            const resultado = await acao(documentoId);
            if (resultado.erro) setErro(resultado.erro);
          })
        }
      >
        {pendente ? (
          "Analisando…"
        ) : jaAnalisado ? (
          "Refazer análise"
        ) : (
          <>
            <IconeSelo tamanho={16} /> Analisar documento
          </>
        )}
      </button>
      {erro && <span className="mt-2 max-w-xs text-xs text-[var(--color-vermelho)]">{erro}</span>}
    </span>
  );
}
