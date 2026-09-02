import "server-only";

import type { z } from "zod";
import type { ModoIA } from "../modos";

export interface Turno {
  papel: "user" | "assistant";
  conteudo: string;
}

export interface OpcoesConversa {
  sistema: string;
  turnos: Turno[];
  maxTokens?: number;
  temperatura?: number;
}

export interface OpcoesEstruturado<T> extends OpcoesConversa {
  schema: z.ZodType<T>;
  nomeFerramenta: string;
  descricaoFerramenta: string;
}

export interface Provedor {
  id: ModoIA;
  /** O nome da variável de ambiente que liga este modo. */
  variavelChave: string;
  /** Modelo efetivamente em uso — aparece no diagnóstico. */
  modelo(): string;
  disponivel(): boolean;
  responder(opcoes: OpcoesConversa): Promise<string>;
  responderEmFluxo(opcoes: OpcoesConversa): AsyncGenerator<string, void, unknown>;
  gerarEstruturado<T>(opcoes: OpcoesEstruturado<T>): Promise<T>;
}

export class ErroDeGeracao extends Error {}

/**
 * Erro de provedor com a causa em linguagem de gente.
 *
 * O 429 é o caso que mais vai acontecer: nível gratuito tem limite por minuto e
 * por dia. Dizer "limite atingido, troque de modo" é acionável; "HTTP 429" não.
 */
export class ErroDeProvedor extends Error {
  constructor(
    readonly modo: ModoIA,
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

export async function erroDaResposta(
  modo: ModoIA,
  rotulo: string,
  resposta: Response,
): Promise<ErroDeProvedor> {
  const corpo = await resposta.text().catch(() => "");
  const detalhe = corpo.slice(0, 400);

  if (resposta.status === 429) {
    return new ErroDeProvedor(
      modo,
      429,
      `O modo ${rotulo} atingiu o limite do nível gratuito. Espere um pouco ou ` +
        `escolha outro modo — a conversa continua de onde parou.`,
    );
  }
  if (resposta.status === 401 || resposta.status === 403) {
    return new ErroDeProvedor(
      modo,
      resposta.status,
      `A chave do modo ${rotulo} foi recusada (HTTP ${resposta.status}). Confira a ` +
        `variável de ambiente correspondente.`,
    );
  }
  return new ErroDeProvedor(
    modo,
    resposta.status,
    `O modo ${rotulo} respondeu com HTTP ${resposta.status}. ${detalhe}`,
  );
}

/** Linhas `data:` de um fluxo SSE, já sem o prefixo. */
export async function* linhasSSE(corpo: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const leitor = corpo.getReader();
  const decodificador = new TextDecoder();
  let resto = "";

  try {
    while (true) {
      const { done, value } = await leitor.read();
      if (done) break;
      resto += decodificador.decode(value, { stream: true });

      const linhas = resto.split("\n");
      // A última pode estar cortada no meio: volta para o buffer.
      resto = linhas.pop() ?? "";
      for (const linha of linhas) {
        const limpa = linha.trim();
        if (limpa.startsWith("data:")) yield limpa.slice(5).trim();
      }
    }
  } finally {
    leitor.releaseLock();
  }

  const limpa = resto.trim();
  if (limpa.startsWith("data:")) yield limpa.slice(5).trim();
}

/**
 * Extrai o JSON de uma resposta em texto.
 *
 * Nem todo modelo aberto respeita "responda só com JSON": muitos embrulham em
 * cerca de markdown, alguns escrevem uma frase antes. Recortar do primeiro `{`
 * até o último `}` cobre os dois casos sem depender de boa vontade.
 */
export function extrairJson(texto: string): unknown {
  const limpo = texto.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "");
  const inicio = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (inicio === -1 || fim === -1 || fim < inicio) {
    throw new ErroDeGeracao("O modelo não retornou JSON reconhecível.");
  }
  return JSON.parse(limpo.slice(inicio, fim + 1));
}

/** Valida contra o schema e transforma a falha em mensagem legível. */
export function validar<T>(schema: z.ZodType<T>, bruto: unknown): T {
  const validado = schema.safeParse(bruto);
  if (!validado.success) {
    throw new ErroDeGeracao(
      `A estrutura retornada não passou na validação: ${validado.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  return validado.data;
}
