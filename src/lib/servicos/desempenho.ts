import "server-only";

import { db } from "@/lib/db";
import { disciplinaPorSlug } from "@/lib/curriculo";

export interface DesempenhoDisciplina {
  slug: string;
  nome: string;
  emoji: string;
  acertos: number;
  total: number;
  percentual: number;
  /** Semáforo usado na interface e na priorização do plano de estudos. */
  status: "forte" | "atencao" | "critico";
  simulados: number;
}

/** Faixas do semáforo. Abaixo de 60% é lacuna real, não variação de humor. */
function classificar(percentual: number): DesempenhoDisciplina["status"] {
  if (percentual >= 75) return "forte";
  if (percentual >= 60) return "atencao";
  return "critico";
}

export function desempenhoDoAluno(usuarioId: number): DesempenhoDisciplina[] {
  const linhas = db()
    .prepare(
      `SELECT disciplina_slug,
              SUM(acertos)  AS acertos,
              SUM(total)    AS total,
              COUNT(*)      AS simulados
         FROM simulados
        WHERE usuario_id = ? AND finalizado_em IS NOT NULL
        GROUP BY disciplina_slug`,
    )
    .all(usuarioId) as Array<{
    disciplina_slug: string;
    acertos: number;
    total: number;
    simulados: number;
  }>;

  return linhas
    .map((l) => {
      const disciplina = disciplinaPorSlug(l.disciplina_slug);
      const percentual = l.total > 0 ? Math.round((l.acertos / l.total) * 100) : 0;
      return {
        slug: l.disciplina_slug,
        nome: disciplina?.nome ?? l.disciplina_slug,
        emoji: disciplina?.emoji ?? "📘",
        acertos: l.acertos,
        total: l.total,
        percentual,
        status: classificar(percentual),
        simulados: l.simulados,
      };
    })
    .sort((a, b) => a.percentual - b.percentual);
}

/** Disciplina mais fraca com amostra suficiente para a recomendação valer. */
export function pontoMaisFraco(
  desempenho: DesempenhoDisciplina[],
): DesempenhoDisciplina | null {
  const comAmostra = desempenho.filter((d) => d.total >= 5);
  return comAmostra.length > 0 ? comAmostra[0] : null;
}
