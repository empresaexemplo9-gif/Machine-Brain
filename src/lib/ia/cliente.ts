import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

/**
 * Acesso ao modelo.
 *
 * Sem ANTHROPIC_API_KEY a plataforma NÃO degrada para respostas fabricadas:
 * ela entra em modo demonstração e diz isso na cara do usuário. Toda a
 * interface continua navegável, o que permite avaliar o produto sem chave, mas
 * nenhuma frase jurídica inventada é apresentada como se fosse resposta.
 */

export const MODO_DEMONSTRACAO = !process.env.ANTHROPIC_API_KEY;

export const AVISO_DEMONSTRACAO =
  "**Modo demonstração.** A plataforma está rodando sem `ANTHROPIC_API_KEY`, " +
  "então não há resposta do modelo para exibir aqui. As fontes jurídicas ao lado " +
  "são reais e vêm do catálogo verificado — o que falta é a camada de " +
  "interpretação. Configure a chave em `.env.local` para ativar o Professor IA " +
  "e o Jurista IA.";

let cliente: Anthropic | null = null;

function obterCliente(): Anthropic {
  if (!cliente) cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return cliente;
}

export const MODELO_PRINCIPAL = process.env.MB_MODEL_PRINCIPAL ?? "claude-opus-5";
export const MODELO_RAPIDO = process.env.MB_MODEL_RAPIDO ?? "claude-sonnet-5";

export interface Turno {
  papel: "user" | "assistant";
  conteudo: string;
}

export interface OpcoesConversa {
  sistema: string;
  turnos: Turno[];
  modelo?: string;
  maxTokens?: number;
  temperatura?: number;
}

function paraMensagens(turnos: Turno[]): Anthropic.MessageParam[] {
  return turnos.map((t) => ({ role: t.papel, content: t.conteudo }));
}

/** Resposta completa, sem streaming. Usada em tarefas de fundo. */
export async function responder(opcoes: OpcoesConversa): Promise<string> {
  if (MODO_DEMONSTRACAO) return AVISO_DEMONSTRACAO;

  const resposta = await obterCliente().messages.create({
    model: opcoes.modelo ?? MODELO_PRINCIPAL,
    max_tokens: opcoes.maxTokens ?? 2048,
    temperature: opcoes.temperatura ?? 0.3,
    system: opcoes.sistema,
    messages: paraMensagens(opcoes.turnos),
  });

  return resposta.content
    .filter((bloco): bloco is Anthropic.TextBlock => bloco.type === "text")
    .map((bloco) => bloco.text)
    .join("");
}

/** Resposta em pedaços, para o chat renderizar enquanto o modelo escreve. */
export async function* responderEmFluxo(
  opcoes: OpcoesConversa,
): AsyncGenerator<string, void, unknown> {
  if (MODO_DEMONSTRACAO) {
    yield AVISO_DEMONSTRACAO;
    return;
  }

  const fluxo = obterCliente().messages.stream({
    model: opcoes.modelo ?? MODELO_PRINCIPAL,
    max_tokens: opcoes.maxTokens ?? 2048,
    temperature: opcoes.temperatura ?? 0.3,
    system: opcoes.sistema,
    messages: paraMensagens(opcoes.turnos),
  });

  for await (const evento of fluxo) {
    if (evento.type === "content_block_delta" && evento.delta.type === "text_delta") {
      yield evento.delta.text;
    }
  }
}

// ---------------------------------------------------------------------------
// Saída estruturada
// ---------------------------------------------------------------------------

export class ErroDeGeracao extends Error {}

/**
 * Pede ao modelo uma saída que obedece a um schema Zod.
 *
 * O schema vira uma ferramenta e o modelo é obrigado a usá-la, então o retorno
 * já chega como JSON — em vez de texto que precisaríamos garimpar. A validação
 * Zod por cima cobre o caso de o modelo preencher o formato certo com conteúdo
 * fora do domínio (enum inválido, lista vazia, etc.).
 */
export async function gerarEstruturado<T>(opcoes: {
  sistema: string;
  turnos: Turno[];
  schema: z.ZodType<T>;
  nomeFerramenta: string;
  descricaoFerramenta: string;
  modelo?: string;
  maxTokens?: number;
  temperatura?: number;
}): Promise<T> {
  if (MODO_DEMONSTRACAO) {
    throw new ErroDeGeracao(
      "Esta funcionalidade precisa do modelo. Configure ANTHROPIC_API_KEY em .env.local para usá-la.",
    );
  }

  // A API rejeita chaves de metadados no input_schema, então $schema sai fora.
  const jsonSchema = z.toJSONSchema(opcoes.schema) as Record<string, unknown>;
  delete jsonSchema.$schema;

  const resposta = await obterCliente().messages.create({
    model: opcoes.modelo ?? MODELO_PRINCIPAL,
    max_tokens: opcoes.maxTokens ?? 4096,
    temperature: opcoes.temperatura ?? 0.4,
    system: opcoes.sistema,
    messages: paraMensagens(opcoes.turnos),
    tools: [
      {
        name: opcoes.nomeFerramenta,
        description: opcoes.descricaoFerramenta,
        input_schema: jsonSchema as Anthropic.Tool["input_schema"],
      },
    ],
    tool_choice: { type: "tool", name: opcoes.nomeFerramenta },
  });

  const bloco = resposta.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!bloco) throw new ErroDeGeracao("O modelo não retornou a estrutura solicitada.");

  const validado = opcoes.schema.safeParse(bloco.input);
  if (!validado.success) {
    throw new ErroDeGeracao(
      `A estrutura retornada não passou na validação: ${validado.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  return validado.data;
}
