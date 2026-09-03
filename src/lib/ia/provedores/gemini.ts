import "server-only";

import { z } from "zod";
import {
  CacheDeModelo,
  ErroDeGeracao,
  ehModeloDesconhecido,
  erroDaResposta,
  extrairJson,
  linhasSSE,
  preferir,
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

/**
 * Famílias preferidas, em ordem. Flash é a linha do nível gratuito; o restante
 * entra atrás como recurso, e a versão fica de fora de propósito — casar por
 * família sobrevive ao Google trocar 2.0 por 2.5 sem avisar.
 */
const PREFERIDOS = ["flash-lite", "flash", "pro"] as const;
const PROIBIDOS = ["embedding", "aqa", "imagen", "veo", "tts", "vision", "learnlm"];
const ULTIMO_RECURSO = "gemini-2.0-flash";

const cache = new CacheDeModelo();

const listaSchema = z.object({
  models: z
    .array(
      z.object({
        name: z.string(),
        supportedGenerationMethods: z.array(z.string()).nullish(),
      }),
    )
    .nullish(),
});

/** O que a API diz existir hoje, só o que serve para conversar. */
async function listarModelos(): Promise<string[]> {
  const resposta = await fetch(`${base()}?pageSize=200`, {
    headers: { "x-goog-api-key": chave() },
    signal: AbortSignal.timeout(20_000),
  });
  if (!resposta.ok) throw await erroDaResposta(ID, ROTULO, resposta);

  const dados = listaSchema.parse(await resposta.json());
  const servíveis = (dados.models ?? [])
    // A API devolve "models/gemini-2.0-flash"; o prefixo não vai na chamada.
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((id) => !PROIBIDOS.some((p) => id.toLowerCase().includes(p)));

  const comGeracao = (dados.models ?? [])
    .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""));

  // Quando a API informa os métodos, respeita; quando não informa, não descarta.
  const base_ = comGeracao.length > 0 ? servíveis.filter((id) => comGeracao.includes(id)) : servíveis;

  const ordenados: string[] = [];
  for (const trecho of PREFERIDOS) {
    for (const id of base_) {
      if (id.toLowerCase().includes(trecho) && !ordenados.includes(id)) ordenados.push(id);
    }
  }
  for (const id of base_) if (!ordenados.includes(id)) ordenados.push(id);
  return ordenados;
}

async function resolverModelo(): Promise<string> {
  const doAmbiente = (process.env.MB_MODEL_GEMINI ?? "").trim();
  if (doAmbiente) return doAmbiente;

  const emCache = cache.ler();
  if (emCache) return emCache;

  try {
    const escolhido = preferir(await listarModelos(), PREFERIDOS);
    if (escolhido) return cache.gravar(escolhido);
  } catch {
    // Listagem indisponível não impede tentar com o último recurso.
  }
  return ULTIMO_RECURSO;
}

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
  const enviar = async (modeloEscolhido: string) =>
    fetch(`${base()}/${modeloEscolhido}:${caminho}`, {
      method: "POST",
      headers: { "x-goog-api-key": chave(), "content-type": "application/json" },
      body: JSON.stringify(corpoJson),
      signal: AbortSignal.timeout(caminho.includes("stream") ? 120_000 : 60_000),
    });

  const escolhido = await resolverModelo();
  let resposta = await enviar(escolhido);

  // Modelo aposentado: esquece, pergunta de novo, tenta uma vez. Só quando o
  // modelo veio da descoberta — o do ambiente é escolha explícita de alguém.
  if (!resposta.ok && !(process.env.MB_MODEL_GEMINI ?? "").trim()) {
    const corpoDoErro = await resposta.clone().text().catch(() => "");
    if (ehModeloDesconhecido(resposta.status, corpoDoErro)) {
      cache.esquecer();
      const outro = await resolverModelo();
      if (outro !== escolhido) resposta = await enviar(outro);
    }
  }

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
  modelo: () => (process.env.MB_MODEL_GEMINI ?? "").trim() || cache.ler() || "(a descobrir)",
  listarModelos,
  resolverModelo,
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
