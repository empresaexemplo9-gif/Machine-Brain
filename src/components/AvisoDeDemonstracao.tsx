import { MODOS_IA } from "@/lib/ia/modos";

/**
 * Faixa exibida quando a plataforma roda sem chave de nenhum provedor.
 *
 * Deliberadamente visível: um usuário avaliando o produto precisa saber que o
 * que ele está vendo é a interface, não o cérebro.
 *
 * Lista os três modos gratuitos porque a barreira aqui é de minutos, não de
 * dinheiro: qualquer uma das chaves já liga o Professor IA.
 */

const GRATUITOS = MODOS_IA.filter((m) => m.id !== "parecer");

export function AvisoDeDemonstracao() {
  return (
    <div className="mb-5 rounded-lg border border-[var(--color-ambar)]/40 bg-[var(--color-ambar)]/10 px-4 py-3">
      <p className="text-xs font-semibold text-[var(--color-ambar)]">Modo demonstração</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--color-texto-suave)]">
        Nenhum provedor de IA está configurado, então o modelo não responde. Navegação, catálogo de
        fontes e histórico funcionam normalmente — nenhuma resposta jurídica é fabricada para
        preencher o espaço.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-[var(--color-texto-suave)]">
        Basta <strong>uma</strong> destas chaves, todas com nível gratuito:
      </p>
      <ul className="mt-1.5 space-y-1 text-xs text-[var(--color-texto-suave)]">
        {GRATUITOS.map((m) => (
          <li key={m.id}>
            <code className="rounded bg-black/30 px-1">{m.variavelChave}</code>{" "}
            <span className="text-[var(--color-texto-fraco)]">
              — modo {m.rotulo} ({m.provedor}),{" "}
              <a href={m.ondePegar} className="underline" rel="noreferrer" target="_blank">
                pegar a chave
              </a>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
