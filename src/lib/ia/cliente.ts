import "server-only";

import type { z } from "zod";
import type { ModoIA } from "./modos";
import { escolherProvedor, modosDisponiveis, semNenhumaChave } from "./provedores";
import { ErroDeGeracao, type OpcoesConversa, type Turno } from "./provedores/tipos";

/**
 * Acesso ao modelo.
 *
 * Esta é a fachada que o resto da aplicação usa; quem sabe falar com cada
 * provedor é src/lib/ia/provedores/. A escolha de modo é sempre opcional: sem
 * ela, usa-se o primeiro disponível, gratuitos antes do pago.
 *
 * Sem chave NENHUMA a plataforma não degrada para respostas fabricadas: entra
 * em modo demonstração e diz isso na cara do usuário. Toda a interface continua
 * navegável, o que permite avaliar o produto sem chave, mas nenhuma frase
 * jurídica inventada é apresentada como se fosse resposta.
 */

export { ErroDeGeracao };
export type { OpcoesConversa, Turno };

/** Calculado a cada leitura: em serverless o processo pode subir sem a chave. */
export const MODO_DEMONSTRACAO = semNenhumaChave();

export const AVISO_DEMONSTRACAO =
  "**Modo demonstração.** A plataforma está rodando sem chave de nenhum provedor " +
  "de IA, então não há resposta do modelo para exibir aqui. As fontes jurídicas ao " +
  "lado são reais e vêm do catálogo verificado — o que falta é a camada de " +
  "interpretação. Basta uma chave gratuita (Groq, Gemini ou OpenRouter) para " +
  "ativar o Professor IA e o Jurista IA.";

export { modosDisponiveis };

interface ComModo {
  modo?: ModoIA;
}

/** Resposta completa, sem streaming. Usada em tarefas de fundo. */
export async function responder(opcoes: OpcoesConversa & ComModo): Promise<string> {
  const provedor = escolherProvedor(opcoes.modo);
  if (!provedor) return AVISO_DEMONSTRACAO;
  return provedor.responder(opcoes);
}

/** Resposta em pedaços, para o chat renderizar enquanto o modelo escreve. */
export async function* responderEmFluxo(
  opcoes: OpcoesConversa & ComModo,
): AsyncGenerator<string, void, unknown> {
  const provedor = escolherProvedor(opcoes.modo);
  if (!provedor) {
    yield AVISO_DEMONSTRACAO;
    return;
  }
  yield* provedor.responderEmFluxo(opcoes);
}

/**
 * Pede ao modelo uma saída que obedece a um schema Zod.
 *
 * Cada provedor resolve isso do jeito que consegue — ferramenta forçada onde
 * há suporte, JSON no texto onde não há — e todos validam com o mesmo schema
 * antes de devolver. Quem chama recebe o tipo, ou um erro; nunca um meio-termo.
 */
export async function gerarEstruturado<T>(opcoes: {
  sistema: string;
  turnos: Turno[];
  schema: z.ZodType<T>;
  nomeFerramenta: string;
  descricaoFerramenta: string;
  modo?: ModoIA;
  maxTokens?: number;
  temperatura?: number;
}): Promise<T> {
  const provedor = escolherProvedor(opcoes.modo);
  if (!provedor) {
    throw new ErroDeGeracao(
      "Esta funcionalidade precisa de um modelo. Configure uma chave gratuita " +
        "(GROQ_API_KEY, GEMINI_API_KEY ou OPENROUTER_API_KEY) para usá-la.",
    );
  }
  return provedor.gerarEstruturado(opcoes);
}
