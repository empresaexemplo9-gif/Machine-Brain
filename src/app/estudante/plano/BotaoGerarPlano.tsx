"use client";

import { useState, useTransition } from "react";
import type { EstadoPlano } from "./acoes";

export function BotaoGerarPlano({
  acao,
  jaExiste,
}: {
  acao: () => Promise<EstadoPlano>;
  jaExiste: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="text-right">
      <button
        type="button"
        className="botao"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            setErro(null);
            const resultado = await acao();
            if (resultado.erro) setErro(resultado.erro);
          })
        }
      >
        {pendente ? "Montando…" : jaExiste ? "Refazer plano" : "Gerar meu plano"}
      </button>
      {erro && <p className="mt-2 max-w-xs text-xs text-[var(--color-vermelho)]">{erro}</p>}
    </div>
  );
}
