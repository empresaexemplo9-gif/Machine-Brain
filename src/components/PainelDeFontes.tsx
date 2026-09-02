import type { AuditoriaDeCitacoes, Fonte } from "@/lib/fontes";

/**
 * Coluna de fontes que acompanha cada resposta.
 *
 * É o contraponto visual da resposta da IA: a esquerda interpreta, a direita
 * mostra de onde veio. Uma resposta sem nada nesta coluna é uma resposta que o
 * usuário deve ler como opinião, e a interface diz isso.
 */
export function PainelDeFontes({
  fontes,
  auditoria,
  titulo = "Fontes consultadas",
}: {
  fontes: Fonte[];
  auditoria?: AuditoriaDeCitacoes | null;
  titulo?: string;
}) {
  return (
    <aside className="space-y-3">
      <h3 className="titulo-secao">{titulo}</h3>

      {fontes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--color-borda)] p-4 text-xs leading-relaxed text-[var(--color-texto-fraco)]">
          Nenhuma fonte do catálogo verificado cobriu este ponto. O que foi
          respondido acima é explicação conceitual — confira o dispositivo na
          fonte oficial antes de usar.
        </p>
      ) : (
        <ol className="space-y-2">
          {fontes.map((fonte, i) => (
            <li key={fonte.id}>
              <a
                href={fonte.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-[var(--color-borda)] bg-[var(--color-superficie)] p-3 transition-colors hover:border-[var(--color-ouro-fraco)]"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 min-w-4 items-center justify-center rounded bg-[var(--color-ouro)]/15 px-1 text-[0.65rem] font-bold text-[var(--color-ouro)]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[var(--color-ouro)]">
                      {fonte.siglaNorma} — {fonte.dispositivo}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-texto-suave)]">{fonte.ementa}</p>
                    <p className="mt-1.5 line-clamp-3 text-[0.7rem] leading-snug text-[var(--color-texto-fraco)]">
                      {fonte.texto}
                    </p>
                    <p className="mt-1.5 text-[0.65rem] text-[var(--color-texto-fraco)]">
                      {fonte.origem} · conferido em {fonte.verificadoEm}
                    </p>
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ol>
      )}

      {auditoria && <AvisosDaAuditoria auditoria={auditoria} />}
    </aside>
  );
}

function AvisosDaAuditoria({ auditoria }: { auditoria: AuditoriaDeCitacoes }) {
  if (auditoria.integra) return null;

  return (
    <div className="rounded-lg border border-[var(--color-vermelho)]/40 bg-[var(--color-vermelho)]/10 p-3">
      <p className="text-xs font-semibold text-[var(--color-vermelho)]">
        Pontos não verificados nesta resposta
      </p>
      {auditoria.citacoesInvalidas.length > 0 && (
        <p className="mt-1.5 text-[0.7rem] leading-relaxed text-[var(--color-texto-suave)]">
          Citou fonte fora do catálogo verificado:{" "}
          <span className="font-mono">{auditoria.citacoesInvalidas.join(", ")}</span>.
        </p>
      )}
      {auditoria.mencoesSemFonte.length > 0 && (
        <p className="mt-1.5 text-[0.7rem] leading-relaxed text-[var(--color-texto-suave)]">
          Mencionou sem apontar a fonte:{" "}
          <span className="font-medium text-[var(--color-texto)]">
            {auditoria.mencoesSemFonte.join(", ")}
          </span>
          . Confira esses dispositivos no texto oficial antes de usar.
        </p>
      )}
    </div>
  );
}

/** Selo compacto exibido junto da resposta. */
export function SeloDeVerificacao({
  auditoria,
  quantidadeFontes,
}: {
  auditoria: AuditoriaDeCitacoes | null;
  quantidadeFontes: number;
}) {
  if (!auditoria) return null;

  if (auditoria.integra && auditoria.citacoesValidas.length > 0) {
    return (
      <span className="selo border-[var(--color-verde)]/40 bg-[var(--color-verde)]/10 text-[var(--color-verde)]">
        ✓ {auditoria.citacoesValidas.length} de {quantidadeFontes} fontes citadas e conferidas
      </span>
    );
  }

  if (auditoria.integra) {
    return (
      <span className="selo border-[var(--color-borda-forte)] text-[var(--color-texto-fraco)]">
        ○ Explicação conceitual — nenhum dispositivo afirmado
      </span>
    );
  }

  return (
    <span className="selo border-[var(--color-vermelho)]/40 bg-[var(--color-vermelho)]/10 text-[var(--color-vermelho)]">
      ⚠ Contém afirmação sem fonte verificada
    </span>
  );
}
