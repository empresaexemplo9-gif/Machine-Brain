/**
 * Os modos de IA oferecidos, e o que cada um é.
 *
 * Sem `server-only`: a interface precisa desta lista para desenhar o seletor, e
 * aqui não há chave nenhuma — só rótulo, provedor e descrição. Quem sabe das
 * chaves é src/lib/ia/provedores/, que nunca chega ao navegador.
 *
 * Os três primeiros existem para a plataforma funcionar antes de haver plano
 * pago: todos têm nível gratuito. O quarto é a chave paga, quando houver.
 */

export const MODOS_IA = [
  {
    id: "estudo",
    rotulo: "Estudo",
    provedor: "Groq",
    resumo: "Explicação rápida",
    descricao:
      "O mais veloz dos três. Bom para tirar dúvida durante a leitura, quando a " +
      "espera atrapalha mais do que o refinamento ajuda.",
    variavelChave: "GROQ_API_KEY",
    ondePegar: "https://console.groq.com/keys",
  },
  {
    id: "pesquisa",
    rotulo: "Pesquisa",
    provedor: "Google Gemini",
    resumo: "Contexto longo",
    descricao:
      "Aguenta textos extensos sem perder o fio. Bom para cruzar vários " +
      "dispositivos de uma vez, ou para acompanhar uma conversa que já ficou longa.",
    variavelChave: "GEMINI_API_KEY",
    ondePegar: "https://aistudio.google.com/apikey",
  },
  {
    id: "debate",
    rotulo: "Debate",
    provedor: "OpenRouter",
    resumo: "Outro ponto de vista",
    descricao:
      "Modelos abertos variados, trocáveis por variável de ambiente. Serve para " +
      "ouvir o argumento contrário antes de fechar posição.",
    variavelChave: "OPENROUTER_API_KEY",
    ondePegar: "https://openrouter.ai/keys",
  },
  {
    id: "parecer",
    rotulo: "Parecer",
    provedor: "Anthropic",
    resumo: "O mais cuidadoso",
    descricao:
      "O modo mais criterioso, e o único pago. Para quando a resposta vai virar " +
      "peça, prova ou decisão.",
    variavelChave: "ANTHROPIC_API_KEY",
    ondePegar: "https://console.anthropic.com/settings/keys",
  },
] as const;

export type ModoIA = (typeof MODOS_IA)[number]["id"];

export type DescricaoModo = (typeof MODOS_IA)[number];

export const IDS_MODOS = MODOS_IA.map((m) => m.id) as readonly ModoIA[];

export function ehModo(valor: unknown): valor is ModoIA {
  return typeof valor === "string" && (IDS_MODOS as readonly string[]).includes(valor);
}

export function descreverModo(id: ModoIA): DescricaoModo {
  const modo = MODOS_IA.find((m) => m.id === id);
  if (!modo) throw new Error(`Modo de IA desconhecido: ${id}`);
  return modo;
}
