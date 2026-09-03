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
 * Remove o bloco de raciocínio que modelos "thinking" emitem antes da resposta.
 *
 * Qwen3, DeepSeek-R1 e afins escrevem <think>…</think> no meio do texto. Numa
 * plataforma jurídica isso é grave por dois motivos, não um: o aluno lê o
 * rascunho do modelo como se fosse a resposta, e o auditor de citações passa a
 * examinar o rascunho — onde o modelo pensa em voz alta sobre artigos que
 * depois descarta. Um "Art. 42" cogitado e abandonado viraria citação não
 * verificada na cara do usuário.
 *
 * Onde o provedor sabe suprimir o bloco na origem, ele é configurado para
 * fazê-lo. Isto aqui é a rede embaixo: vale para qualquer modelo, inclusive os
 * que ignoram o parâmetro.
 */
export function semRaciocinio(texto: string): string {
  return texto.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/^\s+/, "");
}

/** Início de tag que pode estar cortado na fronteira entre dois pedaços. */
function tamanhoDoRabo(texto: string, alvo: string): number {
  const max = Math.min(texto.length, alvo.length - 1);
  for (let n = max; n > 0; n -= 1) {
    if (alvo.startsWith(texto.slice(texto.length - n))) return n;
  }
  return 0;
}

/**
 * Versão em fluxo do acima.
 *
 * O caso que exige máquina de estado: `<think>` pode chegar partido em dois
 * pedaços ("<thi" + "nk>"). Por isso o fim do buffer que ainda pode ser começo
 * de tag fica retido até o pedaço seguinte decidir — emitir antes seria mostrar
 * "<thi" na tela.
 */
export async function* filtrarRaciocinio(
  fonte: AsyncGenerator<string, void, unknown>,
): AsyncGenerator<string, void, unknown> {
  const ABRE = "<think>";
  const FECHA = "</think>";

  let buffer = "";
  let dentro = false;
  let algoEmitido = false;

  for await (const pedaco of fonte) {
    buffer += pedaco;

    for (;;) {
      if (dentro) {
        const fim = buffer.indexOf(FECHA);
        if (fim === -1) {
          // Segura só o que pode ser começo de </think>; o resto é raciocínio.
          buffer = buffer.slice(-(FECHA.length - 1));
          break;
        }
        buffer = buffer.slice(fim + FECHA.length);
        dentro = false;
        continue;
      }

      const inicio = buffer.indexOf(ABRE);
      if (inicio === -1) break;

      const antes = buffer.slice(0, inicio);
      if (antes) {
        algoEmitido = true;
        yield antes;
      }
      buffer = buffer.slice(inicio + ABRE.length);
      dentro = true;
    }

    if (!dentro) {
      const reter = tamanhoDoRabo(buffer, ABRE);
      const pronto = buffer.slice(0, buffer.length - reter);
      buffer = buffer.slice(buffer.length - reter);
      // A resposta costuma começar com quebras de linha depois do bloco.
      const saida = algoEmitido ? pronto : pronto.replace(/^\s+/, "");
      if (saida) {
        algoEmitido = true;
        yield saida;
      }
    }
  }

  if (!dentro && buffer) yield algoEmitido ? buffer : buffer.replace(/^\s+/, "");
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
