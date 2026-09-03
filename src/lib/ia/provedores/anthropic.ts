import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  ErroDeGeracao,
  validar,
  type OpcoesConversa,
  type OpcoesEstruturado,
  type Provedor,
  type Turno,
} from "./tipos";

/**
 * Anthropic — o modo "Parecer", único pago.
 *
 * Continua usando o SDK oficial (já era dependência) em vez de fetch: aqui a
 * saída estruturada usa ferramenta forçada de verdade, então o retorno chega
 * como objeto, sem depender de o modelo respeitar "só JSON".
 */

const ID = "parecer" as const;

const chave = () => (process.env.ANTHROPIC_API_KEY ?? "").trim();
const modelo = () => (process.env.MB_MODEL_PRINCIPAL ?? "").trim() || "claude-opus-5";

let cliente: Anthropic | null = null;
function obterCliente(): Anthropic {
  if (!cliente) cliente = new Anthropic({ apiKey: chave() });
  return cliente;
}

function paraMensagens(turnos: Turno[]): Anthropic.MessageParam[] {
  return turnos.map((t) => ({ role: t.papel, content: t.conteudo }));
}

export const provedorAnthropic: Provedor = {
  id: ID,
  variavelChave: "ANTHROPIC_API_KEY",
  modelo,
  // Aqui não há descoberta: o modo é pago e os ids são estáveis, então trocar
  // de modelo sozinho gastaria dinheiro de um jeito que ninguém pediu.
  listarModelos: async () => {
    const pagina = await obterCliente().models.list({ limit: 20 });
    return pagina.data.map((m) => m.id);
  },
  resolverModelo: async () => modelo(),
  disponivel: () => chave().length > 0,

  async responder(opcoes: OpcoesConversa): Promise<string> {
    const resposta = await obterCliente().messages.create({
      model: modelo(),
      max_tokens: opcoes.maxTokens ?? 2048,
      temperature: opcoes.temperatura ?? 0.3,
      system: opcoes.sistema,
      messages: paraMensagens(opcoes.turnos),
    });
    return resposta.content
      .filter((bloco): bloco is Anthropic.TextBlock => bloco.type === "text")
      .map((bloco) => bloco.text)
      .join("");
  },

  async *responderEmFluxo(opcoes: OpcoesConversa) {
    const fluxo = obterCliente().messages.stream({
      model: modelo(),
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
  },

  async gerarEstruturado<T>(opcoes: OpcoesEstruturado<T>): Promise<T> {
    // A API rejeita chaves de metadados no input_schema, então $schema sai fora.
    const jsonSchema = z.toJSONSchema(opcoes.schema) as Record<string, unknown>;
    delete jsonSchema.$schema;

    const resposta = await obterCliente().messages.create({
      model: modelo(),
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

    const bloco = resposta.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!bloco) throw new ErroDeGeracao("O modelo não retornou a estrutura solicitada.");
    return validar(opcoes.schema, bloco.input);
  },
};
