/**
 * Regras do plano pré-pago por PIX.
 *
 * O assinante escolhe quanto pagar; o valor define o período. Não há renovação
 * automática nem cobrança recorrente — quando expira, a conta volta ao gratuito
 * e continua funcionando, só sem o modo pago.
 *
 * Sem `server-only`: a tela de pagamento precisa mostrar a tabela. Não há
 * segredo aqui — a chave PIX e a validação do pagamento ficam no servidor.
 */

export interface Faixa {
  /** Valor mínimo, em centavos, para esta faixa valer. */
  centavos: number;
  dias: number;
  rotulo: string;
  detalhe: string;
}

/**
 * Da maior para a menor: a busca pega a primeira que o valor alcança.
 *
 * Os R$ 100 dão 35 dias — 30 do mês mais 5 de bônus. O bônus é da faixa, não
 * do valor exato: quem pagar R$ 120 também leva.
 */
export const FAIXAS: readonly Faixa[] = [
  { centavos: 10_000, dias: 35, rotulo: "R$ 100", detalhe: "1 mês + 5 dias de bônus" },
  { centavos: 5_000, dias: 14, rotulo: "R$ 50", detalhe: "2 semanas" },
  { centavos: 2_500, dias: 7, rotulo: "R$ 25", detalhe: "1 semana" },
];

export const MINIMO_CENTAVOS = 2_500;

/**
 * Dias que o valor compra, ou null se não alcança o mínimo.
 *
 * Valor entre faixas arredonda para baixo: R$ 70 dá 14 dias, não 21. A regra é
 * a mesma em qualquer lugar do sistema — a tela, o webhook e a confirmação
 * manual chamam esta função, para o aluno não ver uma promessa que a ativação
 * depois não cumpre.
 */
export function diasPara(centavos: number): number | null {
  if (!Number.isFinite(centavos) || centavos < MINIMO_CENTAVOS) return null;
  return FAIXAS.find((f) => centavos >= f.centavos)?.dias ?? null;
}

export function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Fim do período, a partir de agora ou do fim de uma assinatura ainda válida. */
export function calcularExpiracao(dias: number, expiracaoAtual?: Date | null): Date {
  // Quem renova antes de vencer não perde o que já pagou: o novo período começa
  // no fim do atual. Sem isso, pagar adiantado seria pior do que pagar em cima
  // da hora, e ninguém pagaria adiantado.
  const base =
    expiracaoAtual && expiracaoAtual.getTime() > Date.now() ? expiracaoAtual : new Date();
  const fim = new Date(base);
  fim.setUTCDate(fim.getUTCDate() + dias);
  return fim;
}

export function diasRestantes(expiraEm: Date): number {
  const ms = expiraEm.getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}
