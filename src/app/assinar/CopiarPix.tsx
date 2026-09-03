"use client";

import { useState } from "react";

/** Copia e cola do PIX. O botão existe porque ninguém digita 200 caracteres. */
export function CopiarPix({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Navegador sem permissão de área de transferência: o texto continua
      // selecionável abaixo, então o caminho manual permanece aberto.
      setCopiado(false);
    }
  }

  return (
    <div className="mt-3">
      <button type="button" onClick={copiar} className="botao w-full">
        {copiado ? "Copiado ✓" : "Copiar código PIX"}
      </button>
      <p className="mt-2 break-all font-mono text-[10px] leading-relaxed text-[var(--color-texto-fraco)]">
        {codigo}
      </p>
    </div>
  );
}
