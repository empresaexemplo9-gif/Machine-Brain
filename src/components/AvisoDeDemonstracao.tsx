/**
 * Faixa exibida quando a plataforma roda sem ANTHROPIC_API_KEY.
 *
 * Deliberadamente visível: um usuário avaliando o produto precisa saber que o
 * que ele está vendo é a interface, não o cérebro.
 */
export function AvisoDeDemonstracao() {
  return (
    <div className="mb-5 rounded-lg border border-[var(--color-ambar)]/40 bg-[var(--color-ambar)]/10 px-4 py-3">
      <p className="text-xs font-semibold text-[var(--color-ambar)]">Modo demonstração</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--color-texto-suave)]">
        A plataforma está sem <code className="rounded bg-black/30 px-1">ANTHROPIC_API_KEY</code>, então
        o modelo não responde. Navegação, catálogo de fontes e histórico funcionam normalmente —
        nenhuma resposta jurídica é fabricada para preencher o espaço. Configure a chave em{" "}
        <code className="rounded bg-black/30 px-1">.env.local</code> para ativar.
      </p>
    </div>
  );
}
