import "server-only";

import type { ModoIA } from "../modos";
import {
  CacheDeModelo,
  ErroDeGeracao,
  ehModeloDesconhecido,
  erroDaResposta,
  extrairJson,
  filtrarRaciocinio,
  linhasSSE,
  preferir,
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
  /** Famílias preferidas, em ordem, entre os modelos que o provedor listar. */
  preferidos: readonly string[];
  /** Nomes que nunca servem para conversa (áudio, embedding, moderação). */
  excluir?: readonly string[];
  /** Só entram modelos sem custo? (OpenRouter cobra em quase todos.) */
  apenasGratuitos?: boolean;
  /** Último recurso, se a listagem falhar e não houver nada no ambiente. */
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

const listaSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      // O OpenRouter informa preço por token; "0" é o que caracteriza gratuito.
      pricing: z.object({ prompt: z.string().nullish(), completion: z.string().nullish() }).nullish(),
    }),
  ),
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

  const cache = new CacheDeModelo();
  const EXCLUIR_PADRAO = ["whisper", "tts", "embed", "guard", "moderation", "distil"];

  /** Modelos servíveis que o provedor diz ter, já filtrados e ordenados. */
  async function listarModelos(): Promise<string[]> {
    const resposta = await fetch(`${base()}/models`, {
      headers: { authorization: `Bearer ${chave()}`, ...(config.cabecalhosExtra ?? {}) },
      signal: AbortSignal.timeout(20_000),
    });
    if (!resposta.ok) throw await erroDaResposta(config.id, config.rotulo, resposta);

    const dados = listaSchema.parse(await resposta.json());
    const proibidos = [...EXCLUIR_PADRAO, ...(config.excluir ?? [])];

    const servíveis = dados.data
      .filter((m) => !proibidos.some((p) => m.id.toLowerCase().includes(p)))
      .filter((m) => {
        if (!config.apenasGratuitos) return true;
        // Sem preço declarado não dá para afirmar que é grátis: fica de fora.
        const preco = m.pricing;
        if (!preco) return m.id.endsWith(":free");
        return Number(preco.prompt ?? "1") === 0 && Number(preco.completion ?? "1") === 0;
      })
      .map((m) => m.id);

    // Reordena pelas famílias preferidas, mantendo o resto atrás.
    const ordenados: string[] = [];
    for (const trecho of config.preferidos) {
      for (const id of servíveis) {
        if (id.toLowerCase().includes(trecho.toLowerCase()) && !ordenados.includes(id)) {
          ordenados.push(id);
        }
      }
    }
    for (const id of servíveis) if (!ordenados.includes(id)) ordenados.push(id);
    return ordenados;
  }

  /**
   * O modelo da próxima chamada.
   *
   * O do ambiente manda, quando existe — quem escreveu ali quis aquele. Sem ele,
   * pergunta ao provedor o que existe hoje em vez de confiar num id fixo no
   * código: id fixo envelhece, e o sintoma é a plataforma parar sem aviso no dia
   * em que o provedor aposenta o modelo.
   */
  async function resolverModelo(): Promise<string> {
    const doAmbiente = (process.env[config.variavelModelo] ?? "").trim();
    if (doAmbiente) return doAmbiente;

    const emCache = cache.ler();
    if (emCache) return emCache;

    try {
      const modelos = await listarModelos();
      const escolhido = preferir(modelos, config.preferidos);
      if (escolhido) return cache.gravar(escolhido);
    } catch {
      // Listagem indisponível não impede tentar: o padrão do código ainda pode
      // valer, e o erro real da chamada diz mais do que o erro da listagem.
    }
    return config.modeloPadrao;
  }

  async function chamar(corpo: Record<string, unknown>, fluxo: boolean): Promise<Response> {
    const enviar = async (modeloEscolhido: string) =>
      fetch(`${base()}/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${chave()}`,
          "content-type": "application/json",
          ...(config.cabecalhosExtra ?? {}),
        },
        body: JSON.stringify({ model: modeloEscolhido, ...extras(), ...corpo, stream: fluxo }),
        signal: AbortSignal.timeout(fluxo ? 120_000 : 60_000),
      });

    const escolhido = await resolverModelo();
    let resposta = await enviar(escolhido);

    // Modelo aposentado é o caso que mais quebra na prática, e é recuperável:
    // esquece o que sabíamos, pergunta de novo, tenta uma vez. Só quando o
    // modelo veio da descoberta — se veio do ambiente, trocá-lo por conta
    // própria seria ignorar uma escolha explícita.
    if (!resposta.ok && !(process.env[config.variavelModelo] ?? "").trim()) {
      const corpoDoErro = await resposta.clone().text().catch(() => "");
      if (ehModeloDesconhecido(resposta.status, corpoDoErro)) {
        cache.esquecer();
        const outro = await resolverModelo();
        if (outro !== escolhido) resposta = await enviar(outro);
      }
    }

    if (!resposta.ok) throw await erroDaResposta(config.id, config.rotulo, resposta);
    return resposta;
  }

  return {
    id: config.id,
    variavelChave: config.variavelChave,
    modelo: () => (process.env[config.variavelModelo] ?? "").trim() || cache.ler() || "(a descobrir)",
    listarModelos,
    resolverModelo,
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
          `${await resolverModelo()} pode não suportar chamada de ferramenta — ` +
          `escolha outro em ${config.variavelModelo}.`,
      );
    },
  };
}
