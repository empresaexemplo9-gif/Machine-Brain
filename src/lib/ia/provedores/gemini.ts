import "server-only";

import { z } from "zod";
import {
  ErroDeGeracao,
  erroDaResposta,
  extrairJson,
  linhasSSE,
  validar,
  type OpcoesConversa,
  type OpcoesEstruturado,
  type Provedor,
  type Turno,
} from "./tipos";

/**
 * Google Gemini — o modo "Pesquisa".
 *
 * A API não é compatível com a da OpenAI: papel do assistente chama "model", o
 * prompt de sistema vai num campo próprio, e o texto vem em `parts`. Por isso
 * este arquivo separado em vez de mais um caso no openai-compat.
 *
 * Na saída estruturada usamos responseMimeType JSON + o schema no prompt, em
 * vez de responseSchema: o dialeto aceito lá é um subconjunto do OpenAPI e
 * rejeita construções que o Zod gera (additionalProperties, entre outras).
 * Pedir JSON e validar com Zod dá o mesmo resultado sem casar com o dialeto.
 */

const BASE_PADRAO = "https://generativelanguage.googleapis.com/v1beta/models";
/** Trocável para apontar a um gateway — e para a verificação exercitar o protocolo. */
const base = () => ((process.env.MB_BASE_GEMINI ?? "").trim() || BASE_PADRAO).replace(/\/$/, "");
const ID = "pesquisa" as const;
const ROTULO = "Pesquisa";

const parteSchema = z.object({ text: z.string().nullish() });
const candidatoSchema = z.object({
  candidates: z
    .array(z.object({ content: z.object({ parts: z.array(parteSchema).nullish() }).nullish() }))
    .nullish(),
});

const chave = () => (process.env.GEMINI_API_KEY ?? "").trim();
const modelo = () => (process.env.MB_MODEL_GEMINI ?? "").trim() || "gemini-2.0-flash";

function corpo(sistema: string, turnos: Turno[], maxTokens: number, temperatura: number) {
  return {
    systemInstruction: { parts: [{ text: sistema }] },
    contents: turnos.map((t) => ({
      // No Gemini o assistente é "model"; "assistant" é rejeitado.
      role: t.papel === "assistant" ? "model" : "user",
      parts: [{ text: t.conteudo }],
    })),
    generationConfig: { temperature: temperatura, maxOutputTokens: maxTokens },
  };
}

async function chamar(caminho: string, corpoJson: Record<string, unknown>): Promise<Response> {
  const resposta = await fetch(`${base()}/${modelo()}:${caminho}`, {
    method: "POST",
    headers: { "x-goog-api-key": chave(), "content-type": "application/json" },
    body: JSON.stringify(corpoJson),
    signal: AbortSignal.timeout(caminho.includes("stream") ? 120_000 : 60_000),
  });
  if (!resposta.ok) throw await erroDaResposta(ID, ROTULO, resposta);
  return resposta;
}

function textoDe(bruto: unknown): string {
  const dados = candidatoSchema.parse(bruto);
  return (dados.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("");
}

export const provedorGemini: Provedor = {
  id: ID,
  variavelChave: "GEMINI_API_KEY",
  modelo,
  disponivel: () => chave().length > 0,

  async responder(opcoes: OpcoesConversa): Promise<string> {
    const resposta = await chamar(
      "generateContent",
      corpo(opcoes.sistema, opcoes.turnos, opcoes.maxTokens ?? 2048, opcoes.temperatura ?? 0.3),
    );
    return textoDe(await resposta.json());
  },

  async *responderEmFluxo(opcoes: OpcoesConversa) {
    const resposta = await chamar(
      "streamGenerateContent?alt=sse",
      corpo(opcoes.sistema, opcoes.turnos, opcoes.maxTokens ?? 2048, opcoes.temperatura ?? 0.3),
    );
    if (!resposta.body) throw new ErroDeGeracao(`O modo ${ROTULO} não abriu o fluxo.`);

    for await (const dado of linhasSSE(resposta.body)) {
      if (dado === "[DONE]") return;
      let texto = "";
      try {
        texto = textoDe(JSON.parse(dado));
      } catch {
        continue;
      }
      if (texto) yield texto;
    }
  },

  async gerarEstruturado<T>(opcoes: OpcoesEstruturado<T>): Promise<T> {
    const jsonSchema = z.toJSONSchema(opcoes.schema) as Record<string, unknown>;
    delete jsonSchema.$schema;

    const base = corpo(
      `${opcoes.sistema}\n\n${opcoes.descricaoFerramenta}\n\nResponda EXCLUSIVAMENTE com um ` +
        `objeto JSON que obedeça a este schema, sem texto em volta:\n${JSON.stringify(jsonSchema)}`,
      opcoes.turnos,
      opcoes.maxTokens ?? 4096,
      opcoes.temperatura ?? 0.4,
    );

    const resposta = await chamar("generateContent", {
      ...base,
      generationConfig: { ...base.generationConfig, responseMimeType: "application/json" },
    });

    const texto = textoDe(await resposta.json());
    if (!texto) throw new ErroDeGeracao(`O modo ${ROTULO} não retornou a estrutura solicitada.`);
    return validar(opcoes.schema, extrairJson(texto));
  },
};
