"use client";

import { useState } from "react";
import type { ModoIA } from "@/lib/ia/modos";

/**
 * Botão que dispara uma chamada real ao provedor, do deploy.
 *
 * O resultado interessa mais quando é falha: é ali que se descobre se o modelo
 * configurado existe, se a chave vale, ou se a cota acabou.
 */
export function TestarModo({ modo, disponivel }: { modo: ModoIA; disponivel: boolean }) {
  const [estado, setEstado] = useState<"parado" | "testando">("parado");
  const [resultado, setResultado] = useState<{ ok: boolean; mensagem: string } | null>(null);

  async function testar() {
    setEstado("testando");
    setResultado(null);
    try {
      const resposta = await fetch("/api/diagnostico/modo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo }),
      });
      const dados = (await resposta.json()) as { ok?: boolean; mensagem?: string; erro?: string };
      setResultado({
        ok: dados.ok === true,
        mensagem: dados.mensagem ?? dados.erro ?? "Sem resposta.",
      });
    } catch (erro) {
      setResultado({
        ok: false,
        mensagem: erro instanceof Error ? erro.message : "Falha na comunicação.",
      });
    } finally {
      setEstado("parado");
    }
  }

  if (!disponivel) return null;

  return (
    <span className="ml-2 inline-flex flex-wrap items-center gap-2 align-middle">
      <button
        type="button"
        onClick={testar}
        disabled={estado === "testando"}
        className="rounded-full border border-[var(--color-borda-forte)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-texto-suave)] transition-colors hover:border-[var(--color-acento)] hover:text-[var(--color-texto)] disabled:opacity-40"
      >
        {estado === "testando" ? "testando…" : "testar agora"}
      </button>
      {resultado && (
        <span
          className={`text-[11px] ${
            resultado.ok ? "text-[var(--color-verde)]" : "text-[var(--color-vermelho)]"
          }`}
        >
          {resultado.ok ? "✓" : "✗"} {resultado.mensagem}
        </span>
      )}
    </span>
  );
}
