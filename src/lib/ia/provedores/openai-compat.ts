import "server-only";

import type { ModoIA } from "../modos";
import {
  ErroDeGeracao,
  erroDaResposta,
  extrairJson,
  filtrarRaciocinio,
  linhasSSE,
  semRaciocinio,
  validar,
  type OpcoesConversa,
  type OpcoesEstruturado,
  type Provedor,
  type Turno,
} from "./tipos";
import { z } from "zod";

/**
 * Groq e OpenRouter falam o mesmo dialeto (/chat/completions da OpenAI), então
 * um código só atende os dois — muda a base, a chave e o modelo padrão.
 *
 * O que difere de verdade é o suporte a ferramentas: na Groq os modelos
 * indicados têm; no OpenRouter depende do modelo escolhido, e os gratuitos
 * variam. Por isso a saída estruturada aqui pede ferramenta E aceita JSON no
 * texto — quem não sabe chamar ferramenta ainda consegue responder.
 */

interface Config {
  id: ModoIA;
  rotulo: string;
  base: string;
  /**
   * Variável que troca o endereço da API. Serve para gateway compatível,
   * proxy corporativo ou modelo local — e é o que permite a bateria de
   * verificação exercitar o protocolo de verdade contra um servidor de teste,
   * em vez de confiar que o parser está certo.
   */
  variavelBase: string;
  variavelChave: string;
  variavelModelo: string;
  /** Prefixo das variáveis de ajuste fino (_TOP_P, _REASONING_EFFORT, …). */
  prefixoAjustes: string;
  modeloPadrao: string;
  cabecalhosExtra?: Record<string, string>;
}

const mensagemSchema = z.object({
  content: z.string().nullish(),
  tool_calls: z
    .array(z.object({ function: z.object({ name: z.string(), arguments: z.string() }) }))
    .nullish(),
});

const respostaSchema = z.object({
  choices: z.array(z.object({ message: mensagemSchema })).min(1),
});

const pedacoSchema = z.object({
  choices: z.array(z.object({ delta: z.object({ content: z.string().nullish() }) })).min(1),
});

function paraMensagens(sistema: string, turnos: Turno[]) {
  return [
    { role: "system", content: sistema },
    ...turnos.map((t) => ({ role: t.papel, content: t.conteudo })),
  ];
}

export function criarProvedorOpenAI(config: Config): Provedor {
  const chave = () => (process.env[config.variavelChave] ?? "").trim();
  const modelo = () => (process.env[config.variavelModelo] ?? "").trim() || config.modeloPadrao;
  const base = () =>
    ((process.env[config.variavelBase] ?? "").trim() || config.base).replace(/\/$/, "");

  /**
   * Ajustes que só fazem sentido em alguns modelos, todos opcionais.
   *
   * `reasoning_format: hidden` é o que impede o bloco <think> de um Qwen3 ou
   * R1 de chegar à tela. Provedor que não conhece o parâmetro costuma ignorá-lo;
   * o filtro em filtrarRaciocinio cobre esse caso.
   */
  function extras(): Record<string, unknown> {
    const numero = (nome: string) => {
      const bruto = (process.env[nome] ?? "").trim();
      if (!bruto) return undefined;
      const valor = Number(bruto);
      return Number.isFinite(valor) ? valor : undefined;
    };
    const texto = (nome: string) => (process.env[nome] ?? "").trim() || undefined;

    const campos: Record<string, unknown> = {
      top_p: numero(`${config.prefixoAjustes}_TOP_P`),
      reasoning_effort: texto(`${config.prefixoAjustes}_REASONING_EFFORT`),
      reasoning_format: texto(`${config.prefixoAjustes}_REASONING_FORMAT`),
    };
    for (const chave of Object.keys(campos)) {
      if (campos[chave] === undefined) delete campos[chave];
    }
    return campos;
  }

  async function chamar(corpo: Record<string, unknown>, fluxo: boolean): Promise<Response> {
    const resposta = await fetch(`${base()}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${chave()}`,
        "content-type": "application/json",
        ...(config.cabecalhosExtra ?? {}),
      },
      body: JSON.stringify({ model: modelo(), ...extras(), ...corpo, stream: fluxo }),
      signal: AbortSignal.timeout(fluxo ? 120_000 : 60_000),
    });
    if (!resposta.ok) throw await erroDaResposta(config.id, config.rotulo, resposta);
    return resposta;
  }

  return {
    id: config.id,
    variavelChave: config.variavelChave,
    modelo,
    disponivel: () => chave().length > 0,

    async responder(opcoes: OpcoesConversa): Promise<string> {
      const resposta = await chamar(
        {
          messages: paraMensagens(opcoes.sistema, opcoes.turnos),
          max_tokens: opcoes.maxTokens ?? 2048,
          temperature: opcoes.temperatura ?? 0.3,
        },
        false,
      );
      const dados = respostaSchema.parse(await resposta.json());
      return semRaciocinio(dados.choices[0].message.content ?? "");
    },

    async *responderEmFluxo(opcoes: OpcoesConversa) {
      const resposta = await chamar(
        {
          messages: paraMensagens(opcoes.sistema, opcoes.turnos),
          max_tokens: opcoes.maxTokens ?? 2048,
          temperature: opcoes.temperatura ?? 0.3,
        },
        true,
      );
      if (!resposta.body) throw new ErroDeGeracao(`O modo ${config.rotulo} não abriu o fluxo.`);

      const corpoDoFluxo = resposta.body;
      async function* bruto(): AsyncGenerator<string, void, unknown> {
        for await (const dado of linhasSSE(corpoDoFluxo)) {
          if (dado === "[DONE]") return;
          let pedaco;
          try {
            pedaco = pedacoSchema.parse(JSON.parse(dado));
          } catch {
            // Comentários de keep-alive e eventos de metadados entram aqui.
            continue;
          }
          const texto = pedaco.choices[0].delta.content;
          if (texto) yield texto;
        }
      }

      yield* filtrarRaciocinio(bruto());
    },

    async gerarEstruturado<T>(opcoes: OpcoesEstruturado<T>): Promise<T> {
      const jsonSchema = z.toJSONSchema(opcoes.schema) as Record<string, unknown>;
      delete jsonSchema.$schema;

      const resposta = await chamar(
        {
          messages: paraMensagens(
            `${opcoes.sistema}\n\nResponda EXCLUSIVAMENTE com um objeto JSON que obedeça a ` +
              `este schema, sem texto em volta:\n${JSON.stringify(jsonSchema)}`,
            opcoes.turnos,
          ),
          max_tokens: opcoes.maxTokens ?? 4096,
          temperature: opcoes.temperatura ?? 0.4,
          tools: [
            {
              type: "function",
              function: {
                name: opcoes.nomeFerramenta,
                description: opcoes.descricaoFerramenta,
                parameters: jsonSchema,
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: opcoes.nomeFerramenta },
          },
        },
        false,
      );

      const dados = respostaSchema.parse(await resposta.json());
      const mensagem = dados.choices[0].message;

      const chamada = mensagem.tool_calls?.[0];
      if (chamada) return validar(opcoes.schema, JSON.parse(chamada.function.arguments));

      // Modelo sem suporte a ferramenta: o JSON veio no texto, se veio.
      if (mensagem.content) {
        return validar(opcoes.schema, extrairJson(semRaciocinio(mensagem.content)));
      }

      throw new ErroDeGeracao(
        `O modo ${config.rotulo} não retornou a estrutura solicitada. O modelo ` +
          `${modelo()} pode não suportar chamada de ferramenta — troque em ${config.variavelModelo}.`,
      );
    },
  };
}
