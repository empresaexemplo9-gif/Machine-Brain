import type { DesempenhoDisciplina } from "@/lib/servicos/desempenho";

const CORES: Record<DesempenhoDisciplina["status"], { barra: string; texto: string; rotulo: string }> = {
  forte: { barra: "bg-[var(--color-verde)]", texto: "text-[var(--color-verde)]", rotulo: "🟢 Domina" },
  atencao: { barra: "bg-[var(--color-ambar)]", texto: "text-[var(--color-ambar)]", rotulo: "🟡 Atenção" },
  critico: { barra: "bg-[var(--color-vermelho)]", texto: "text-[var(--color-vermelho)]", rotulo: "🔴 Prioridade" },
};

export function BarraDeDesempenho({ desempenho }: { desempenho: DesempenhoDisciplina }) {
  const cor = CORES[desempenho.status];
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm font-medium">
          <span className="mr-1.5">{desempenho.emoji}</span>
          {desempenho.nome}
        </p>
        <p className={`shrink-0 text-sm font-bold tabular-nums ${cor.texto}`}>
          {desempenho.percentual}%
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-superficie-2)]">
        <div
          className={`h-full rounded-full ${cor.barra}`}
          style={{ width: `${desempenho.percentual}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-[var(--color-texto-fraco)]">
        {cor.rotulo} · {desempenho.acertos}/{desempenho.total} questões em {desempenho.simulados}{" "}
        {desempenho.simulados === 1 ? "simulado" : "simulados"}
      </p>
    </div>
  );
}
