import type { ModoIA } from "./ia/modos";

/**
 * Planos da conta e o que cada um enxerga.
 *
 * Só entra aqui o que separa um plano do outro. Hoje é uma coisa só: quais
 * modos de IA aparecem. Os três gratuitos têm nível grátis nos provedores, e
 * por isso saem para todo mundo; o modo Parecer usa a API paga da Anthropic,
 * que cobra por token desde a primeira chamada — deixá-lo visível no plano
 * gratuito seria oferecer um botão que gasta dinheiro da plataforma.
 *
 * Sem `server-only`: a interface precisa da lista para desenhar o seletor. A
 * decisão que vale, porém, é a do servidor — ver escolherProvedor(). O que a
 * interface faz é não oferecer; o que o servidor faz é não entregar.
 */

export type Plano = "gratuito" | "pro";

export const PLANOS = {
  gratuito: {
    rotulo: "Gratuito",
    descricao: "Professor IA, questões, plano de estudos e fontes verificadas.",
    modos: ["estudo", "pesquisa", "debate"],
  },
  pro: {
    rotulo: "Pro",
    descricao: "Tudo do gratuito, mais o modo Parecer para quando a resposta vira peça.",
    modos: ["estudo", "pesquisa", "debate", "parecer"],
  },
} as const satisfies Record<Plano, { rotulo: string; descricao: string; modos: readonly ModoIA[] }>;

export const PLANO_PADRAO: Plano = "gratuito";

export function ehPlano(valor: unknown): valor is Plano {
  return valor === "gratuito" || valor === "pro";
}

/** Modos que o plano autoriza. Nada aqui garante que exista chave para eles. */
export function modosDoPlano(plano: Plano): readonly ModoIA[] {
  return PLANOS[plano].modos;
}

export function planoPermite(plano: Plano, modo: ModoIA): boolean {
  return (modosDoPlano(plano) as readonly ModoIA[]).includes(modo);
}
