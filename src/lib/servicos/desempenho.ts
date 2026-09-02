import "server-only";

import { supabaseServidor } from "@/lib/supabase/servidor";
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

export async function desempenhoDoAluno(): Promise<DesempenhoDisciplina[]> {
  const supabase = await supabaseServidor();

  // A agregação vem para o Node em vez de virar uma view no banco: são dezenas
  // de simulados por aluno, e uma view a mais é uma migração a mais para
  // manter. Se um dia o volume crescer, isto vira uma view com RLS herdado.
  const { data } = await supabase
    .from("simulados")
    .select("disciplina_slug, acertos, total")
    .not("finalizado_em", "is", null);

  const porDisciplina = new Map<string, { acertos: number; total: number; simulados: number }>();
  for (const linha of data ?? []) {
    const slug = linha.disciplina_slug as string;
    const atual = porDisciplina.get(slug) ?? { acertos: 0, total: 0, simulados: 0 };
    atual.acertos += (linha.acertos as number | null) ?? 0;
    atual.total += (linha.total as number | null) ?? 0;
    atual.simulados += 1;
    porDisciplina.set(slug, atual);
  }

  return [...porDisciplina.entries()]
    .map(([slug, agregado]) => {
      const disciplina = disciplinaPorSlug(slug);
      const percentual =
        agregado.total > 0 ? Math.round((agregado.acertos / agregado.total) * 100) : 0;
      return {
        slug,
        nome: disciplina?.nome ?? slug,
        emoji: disciplina?.emoji ?? "📘",
        acertos: agregado.acertos,
        total: agregado.total,
        percentual,
        status: classificar(percentual),
        simulados: agregado.simulados,
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
