"use client";

import { useActionState } from "react";
import type { EstadoRoteiro } from "./acoes";

const EXEMPLO =
  "Cliente comprou um imóvel na planta em 2023. A construtora atrasou a entrega em 18 meses e " +
  "agora quer que ele assine um distrato devolvendo só 50% do que pagou. Nunca trabalhei com " +
  "direito imobiliário.";

export function FormularioDeRoteiro({
  acao,
}: {
  acao: (estado: EstadoRoteiro, dados: FormData) => Promise<EstadoRoteiro>;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});

  return (
    <form action={enviar} className="cartao space-y-5">
      <div>
        <label className="rotulo" htmlFor="caso">
          Descreva o caso
        </label>
        <textarea
          id="caso"
          name="caso"
          rows={10}
          className="campo resize-y"
          placeholder={EXEMPLO}
          required
        />
        <p className="mt-2 text-xs text-[var(--color-texto-fraco)]">
          Quanto mais concreto — quem são as partes, o que aconteceu, o que o cliente quer — mais
          útil o roteiro. Não inclua dados que identifiquem o cliente se não precisar.
        </p>
      </div>

      {estado.erro && (
        <p className="rounded-lg border border-[var(--color-vermelho)]/40 bg-[var(--color-vermelho)]/10 px-3 py-2 text-xs text-[var(--color-vermelho)]">
          {estado.erro}
        </p>
      )}

      <button type="submit" className="botao w-full" disabled={pendente}>
        {pendente ? "Montando o roteiro…" : "Montar roteiro de atuação"}
      </button>
    </form>
  );
}
