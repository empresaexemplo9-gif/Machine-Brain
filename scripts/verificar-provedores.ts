/**
 * Verificação dos provedores de IA contra um servidor que fala cada protocolo.
 *
 * As três APIs são HTTP e o código que as consome é parser: fluxo SSE, chamada
 * de ferramenta, JSON embrulhado em cerca de markdown, papel "model" do Gemini.
 * Parser é exatamente o tipo de código que passa na revisão e quebra no ar.
 *
 * Então aqui sobe um servidor local que responde como Groq/OpenRouter e como
 * Gemini respondem, e os provedores de verdade falam com ele — apontados pelas
 * variáveis de base. Não valida a chave nem a cota do provedor real; valida o
 * que é nosso, que é a interpretação da resposta.
 *
 *   npm run verificar:provedores
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { z } from "zod";
import { PROVEDORES, escolherProvedor, modosDisponiveis } from "../src/lib/ia/provedores";
import {
  ErroDeProvedor,
  filtrarRaciocinio,
  semRaciocinio,
} from "../src/lib/ia/provedores/tipos";

const PORTA = Number(process.env.MB_PORTA_PROVEDORES ?? 3411);

let falhas = 0;
const ok = (msg: string) => console.log(`  ✓ ${msg}`);
const falhar = (msg: string, detalhe?: string) => {
  falhas += 1;
  console.log(`  ✗ ${msg}`);
  if (detalhe) console.log(`      ${detalhe}`);
};

async function checar(nome: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    ok(nome);
  } catch (erro) {
    falhar(nome, erro instanceof Error ? erro.message : String(erro));
  }
}

function corpoDe(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let dados = "";
    req.on("data", (p) => (dados += p));
    req.on("end", () => resolve(dados));
  });
}

const json = (res: ServerResponse, status: number, corpo: unknown) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(corpo));
};

/** Manda os pedaços em SSE, e de propósito quebra um deles no meio. */
function sse(res: ServerResponse, eventos: string[]): void {
  res.writeHead(200, { "content-type": "text/event-stream" });
  const inteiro = eventos.map((e) => `data: ${e}\n\n`).join("");
  // O corte no meio de uma linha é o caso que quebra parser ingênuo.
  const meio = Math.floor(inteiro.length / 2);
  res.write(inteiro.slice(0, meio));
  res.write(inteiro.slice(meio));
  res.end();
}

// ---------------------------------------------------------------------------
// O servidor que finge ser cada provedor
// ---------------------------------------------------------------------------
const servidor = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORTA}`);
  const corpo = await corpoDe(req);
  const enviado = corpo ? (JSON.parse(corpo) as Record<string, unknown>) : {};

  // --- listagem de modelos, dialeto Gemini ---
  // O provedor do Gemini pagina com ?pageSize; é o que distingue a rota aqui.
  if (url.searchParams.has("pageSize")) {
    return json(res, 200, {
      models: [
        { name: "models/embedding-001", supportedGenerationMethods: ["embedContent"] },
        { name: "models/gemini-2.5-pro", supportedGenerationMethods: ["generateContent"] },
        { name: "models/gemini-2.5-flash", supportedGenerationMethods: ["generateContent"] },
      ],
    });
  }

  // --- listagem de modelos, dialeto OpenAI ---
  if (url.pathname.endsWith("/models")) {
    // Só o OpenRouter manda http-referer: é como este servidor sabe qual dos
    // dois provedores compatíveis está perguntando, já que a rota é a mesma.
    const ehOpenRouter = Boolean(req.headers["http-referer"]);
    return json(res, 200, {
      data: ehOpenRouter
        ? [
            { id: "openai/gpt-4o", pricing: { prompt: "0.000005", completion: "0.00001" } },
            {
              id: "meta-llama/llama-3.3-70b-instruct:free",
              pricing: { prompt: "0", completion: "0" },
            },
          ]
        : [
            { id: "whisper-large-v3" },
            { id: "llama-3.3-70b-versatile" },
            { id: "gemma2-9b-it" },
          ],
    });
  }

  // --- Groq / OpenRouter (dialeto OpenAI) ---
  if (url.pathname.endsWith("/chat/completions")) {
    if (url.pathname.includes("/cenario-limite/")) {
      return json(res, 429, { error: { message: "rate limit" } });
    }

    const mensagens = enviado.messages as { role: string; content: string }[];
    if (mensagens[0]?.role !== "system") {
      return json(res, 400, { error: { message: "faltou o prompt de sistema" } });
    }

    if (url.pathname.includes("/cenario-aposentado/")) {
      // O modelo do código foi desativado; o descoberto pela listagem serve.
      if (enviado.model === "llama-3.3-70b-versatile") {
        return json(res, 200, { choices: [{ message: { content: "resposta completa" } }] });
      }
      return json(res, 400, {
        error: { message: `The model \`${String(enviado.model)}\` has been decommissioned.` },
      });
    }

    if (url.pathname.includes("/cenario-raciocinio/")) {
      if (enviado.stream === true) {
        // A tag chega PARTIDA entre pedaços: é o caso que quebra parser ingênuo.
        return sse(res, [
          JSON.stringify({ choices: [{ delta: { content: "<thi" } }] }),
          JSON.stringify({ choices: [{ delta: { content: "nk>O usuário quer o art. 42" } }] }),
          JSON.stringify({ choices: [{ delta: { content: ". Não, é o 5º.</thi" } }] }),
          JSON.stringify({ choices: [{ delta: { content: "nk>\n\nArt. 5º " } }] }),
          JSON.stringify({ choices: [{ delta: { content: "da CF/88." } }] }),
          "[DONE]",
        ]);
      }
      return json(res, 200, {
        choices: [{ message: { content: "<think>rascunho</think>\n\nresposta completa" } }],
      });
    }

    if (enviado.stream === true) {
      return sse(res, [
        JSON.stringify({ choices: [{ delta: { content: "Art. 5º " } }] }),
        ":", // keep-alive que não é JSON: tem que ser ignorado, não derrubar
        JSON.stringify({ choices: [{ delta: { content: "da CF/88." } }] }),
        "[DONE]",
      ]);
    }

    if (enviado.tools) {
      // Sem ferramenta, quando o cenário pede: exercita o caminho de recuo.
      if (url.pathname.includes("/cenario-sem-ferramenta/")) {
        return json(res, 200, {
          choices: [
            {
              message: {
                content: 'Claro! Segue:\n```json\n{"titulo":"Plano","itens":["a","b"]}\n```',
              },
            },
          ],
        });
      }
      return json(res, 200, {
        choices: [
          {
            message: {
              tool_calls: [
                {
                  function: {
                    name: "registrar",
                    arguments: JSON.stringify({ titulo: "Plano", itens: ["a", "b"] }),
                  },
                },
              ],
            },
          },
        ],
      });
    }

    return json(res, 200, { choices: [{ message: { content: "resposta completa" } }] });
  }

  // --- Gemini ---
  if (url.pathname.includes(":streamGenerateContent")) {
    return sse(res, [
      JSON.stringify({ candidates: [{ content: { parts: [{ text: "Art. 5º " }] } }] }),
      JSON.stringify({ candidates: [{ content: { parts: [{ text: "da CF/88." }] } }] }),
    ]);
  }

  if (url.pathname.includes(":generateContent")) {
    const conteudos = enviado.contents as { role: string }[];
    // O Gemini rejeita "assistant"; o provedor tem que ter traduzido para "model".
    if (conteudos.some((c) => c.role === "assistant")) {
      return json(res, 400, { error: { message: 'papel "assistant" não foi traduzido' } });
    }
    if (!enviado.systemInstruction) {
      return json(res, 400, { error: { message: "faltou systemInstruction" } });
    }

    const config = enviado.generationConfig as { responseMimeType?: string };
    const texto =
      config?.responseMimeType === "application/json"
        ? '{"titulo":"Plano","itens":["a","b"]}'
        : "resposta completa";
    return json(res, 200, { candidates: [{ content: { parts: [{ text: texto }] } }] });
  }

  return json(res, 404, { error: { message: `rota não simulada: ${url.pathname}` } });
});

// ---------------------------------------------------------------------------
const schema = z.object({ titulo: z.string(), itens: z.array(z.string()).min(1) });

async function juntar(fluxo: AsyncGenerator<string>): Promise<string> {
  let todo = "";
  for await (const p of fluxo) todo += p;
  return todo;
}

async function main(): Promise<void> {
  await new Promise<void>((resolve) => servidor.listen(PORTA, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${PORTA}`;

  process.env.GROQ_API_KEY = "teste";
  process.env.GEMINI_API_KEY = "teste";
  process.env.OPENROUTER_API_KEY = "teste";
  process.env.MB_BASE_GROQ = base;
  process.env.MB_BASE_OPENROUTER = base;
  process.env.MB_BASE_GEMINI = base;

  const conversa = {
    sistema: "Você é o Professor IA.",
    turnos: [
      { papel: "user" as const, conteudo: "O que é o art. 5º?" },
      { papel: "assistant" as const, conteudo: "É o rol de direitos fundamentais." },
      { papel: "user" as const, conteudo: "Detalhe o inciso II." },
    ],
  };
  const estruturado = {
    ...conversa,
    schema,
    nomeFerramenta: "registrar",
    descricaoFerramenta: "Registra o plano.",
  };

  for (const modo of ["estudo", "debate", "pesquisa"] as const) {
    console.log(`\n${modo}`);
    const p = PROVEDORES[modo];

    await checar("reconhece a chave configurada", async () => {
      if (!p.disponivel()) throw new Error("provedor se declarou indisponível");
    });

    await checar("resposta completa", async () => {
      const texto = await p.responder(conversa);
      if (texto !== "resposta completa") throw new Error(`veio: ${JSON.stringify(texto)}`);
    });

    await checar("fluxo remonta os pedaços (com corte no meio da linha)", async () => {
      const texto = await juntar(p.responderEmFluxo(conversa));
      if (texto !== "Art. 5º da CF/88.") throw new Error(`veio: ${JSON.stringify(texto)}`);
    });

    await checar("saída estruturada valida contra o schema", async () => {
      const dado = await p.gerarEstruturado(estruturado);
      if (dado.titulo !== "Plano" || dado.itens.length !== 2) {
        throw new Error(`veio: ${JSON.stringify(dado)}`);
      }
    });
  }

  // Caminhos que só existem no dialeto OpenAI.
  console.log("\ncasos de borda");

  await checar("modelo sem suporte a ferramenta: JSON no texto ainda é aceito", async () => {
    process.env.MB_BASE_GROQ = `${base}/cenario-sem-ferramenta`;
    const dado = await PROVEDORES.estudo.gerarEstruturado(estruturado);
    if (dado.titulo !== "Plano") throw new Error(`veio: ${JSON.stringify(dado)}`);
    process.env.MB_BASE_GROQ = base;
  });

  await checar("limite do nível gratuito vira mensagem acionável", async () => {
    process.env.MB_BASE_GROQ = `${base}/cenario-limite`;
    try {
      await PROVEDORES.estudo.responder(conversa);
      throw new Error("deveria ter falhado");
    } catch (erro) {
      if (!(erro instanceof ErroDeProvedor) || erro.status !== 429) {
        throw new Error(`erro inesperado: ${String(erro)}`);
      }
      if (!erro.message.includes("outro modo")) {
        throw new Error(`mensagem não sugere a saída: ${erro.message}`);
      }
    }
    process.env.MB_BASE_GROQ = base;
  });

  await checar("bloco de raciocínio não chega ao texto (resposta completa)", async () => {
    process.env.MB_BASE_GROQ = `${base}/cenario-raciocinio`;
    const texto = await PROVEDORES.estudo.responder(conversa);
    if (texto !== "resposta completa") throw new Error(`veio: ${JSON.stringify(texto)}`);
    process.env.MB_BASE_GROQ = base;
  });

  await checar("bloco de raciocínio não chega ao texto (fluxo, tag partida)", async () => {
    process.env.MB_BASE_GROQ = `${base}/cenario-raciocinio`;
    const texto = await juntar(PROVEDORES.estudo.responderEmFluxo(conversa));
    if (texto !== "Art. 5º da CF/88.") throw new Error(`veio: ${JSON.stringify(texto)}`);
    process.env.MB_BASE_GROQ = base;
  });

  await checar("o artigo cogitado e descartado não vaza para a auditoria", async () => {
    process.env.MB_BASE_GROQ = `${base}/cenario-raciocinio`;
    const texto = await juntar(PROVEDORES.estudo.responderEmFluxo(conversa));
    // O rascunho menciona "art. 42" e desiste. Se vazasse, o auditor marcaria
    // a resposta como não verificada por causa de algo que o modelo descartou.
    if (texto.includes("42")) throw new Error(`o rascunho vazou: ${JSON.stringify(texto)}`);
    process.env.MB_BASE_GROQ = base;
  });

  await checar("o filtro não engole texto de resposta sem raciocínio", async () => {
    async function* fonte() {
      yield "Art. 5";
      yield "º < 6º, e ";
      yield "isso não é tag.";
    }
    const partes: string[] = [];
    for await (const p of filtrarRaciocinio(fonte())) partes.push(p);
    const texto = partes.join("");
    if (texto !== "Art. 5º < 6º, e isso não é tag.") {
      throw new Error(`veio: ${JSON.stringify(texto)}`);
    }
    if (semRaciocinio("sem bloco aqui") !== "sem bloco aqui") {
      throw new Error("semRaciocinio alterou texto que não tinha bloco");
    }
  });

  console.log("\ndescoberta de modelo");

  await checar("Groq: escolhe a família preferida entre os modelos listados", async () => {
    delete process.env.MB_MODEL_GROQ;
    const escolhido = await PROVEDORES.estudo.resolverModelo();
    if (escolhido !== "llama-3.3-70b-versatile") throw new Error(`escolheu: ${escolhido}`);
  });

  await checar("Groq: modelo de áudio nunca é escolhido para conversa", async () => {
    const modelos = await PROVEDORES.estudo.listarModelos();
    if (modelos.some((m) => m.includes("whisper"))) throw new Error(`veio: ${modelos.join(", ")}`);
  });

  await checar("OpenRouter: modelo pago fica de fora", async () => {
    delete process.env.MB_MODEL_OPENROUTER;
    const modelos = await PROVEDORES.debate.listarModelos();
    if (modelos.includes("openai/gpt-4o")) throw new Error(`pago entrou: ${modelos.join(", ")}`);
    if (!modelos.includes("meta-llama/llama-3.3-70b-instruct:free")) {
      throw new Error(`gratuito não entrou: ${modelos.join(", ")}`);
    }
  });

  await checar("Gemini: tira o prefixo models/ e ignora o de embedding", async () => {
    delete process.env.MB_MODEL_GEMINI;
    const modelos = await PROVEDORES.pesquisa.listarModelos();
    if (modelos.some((m) => m.startsWith("models/"))) throw new Error(`prefixo ficou: ${modelos}`);
    if (modelos.some((m) => m.includes("embedding"))) throw new Error(`embedding entrou: ${modelos}`);
    if (modelos[0] !== "gemini-2.5-flash") throw new Error(`preferiu: ${modelos[0]}`);
  });

  await checar("modelo aposentado: descobre outro e a chamada passa", async () => {
    delete process.env.MB_MODEL_GROQ;
    process.env.MB_BASE_GROQ = `${base}/cenario-aposentado`;
    const texto = await PROVEDORES.estudo.responder(conversa);
    if (texto !== "resposta completa") throw new Error(`veio: ${JSON.stringify(texto)}`);
    process.env.MB_BASE_GROQ = base;
  });

  await checar("modelo do ambiente manda, e não é trocado sozinho", async () => {
    process.env.MB_MODEL_GROQ = "modelo-que-eu-escolhi";
    const escolhido = await PROVEDORES.estudo.resolverModelo();
    if (escolhido !== "modelo-que-eu-escolhi") throw new Error(`escolheu: ${escolhido}`);
    delete process.env.MB_MODEL_GROQ;
  });

  console.log("\nplano da conta");

  await checar("plano gratuito não enxerga o modo pago", async () => {
    process.env.ANTHROPIC_API_KEY = "teste";
    const modos = modosDisponiveis("gratuito");
    if (modos.includes("parecer")) throw new Error(`ofereceu: ${modos.join(", ")}`);
    if (modos.length !== 3) throw new Error(`esperava os 3 gratuitos, veio: ${modos.join(", ")}`);
  });

  await checar("plano pro enxerga os quatro", async () => {
    const modos = modosDisponiveis("pro");
    if (!modos.includes("parecer")) throw new Error(`faltou o pago: ${modos.join(", ")}`);
  });

  await checar("conta gratuita PEDINDO o modo pago não o recebe", async () => {
    // O caminho que a interface não oferece, mas que uma requisição montada à
    // mão tentaria. Quem decide é o servidor, não o corpo do POST.
    const provedor = escolherProvedor("parecer", "gratuito");
    if (provedor?.id === "parecer") throw new Error("entregou o modo pago a uma conta gratuita");
    if (!provedor) throw new Error("deveria ter caído num modo gratuito, não em nenhum");
  });

  await checar("conta pro PEDINDO o modo pago o recebe", async () => {
    const provedor = escolherProvedor("parecer", "pro");
    if (provedor?.id !== "parecer") throw new Error(`veio: ${provedor?.id}`);
    delete process.env.ANTHROPIC_API_KEY;
  });

  await checar("sem chave nenhuma, nenhum provedor se diz disponível", async () => {
    const guardadas = [
      process.env.GROQ_API_KEY,
      process.env.GEMINI_API_KEY,
      process.env.OPENROUTER_API_KEY,
    ];
    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    const algum = (["estudo", "pesquisa", "debate"] as const).some((m) =>
      PROVEDORES[m].disponivel(),
    );
    [process.env.GROQ_API_KEY, process.env.GEMINI_API_KEY, process.env.OPENROUTER_API_KEY] =
      guardadas as [string, string, string];
    if (algum) throw new Error("algum provedor se declarou disponível sem chave");
  });

  servidor.close();

  console.log("");
  if (falhas > 0) {
    console.log(`${falhas} falha(s) nos provedores de IA.\n`);
    process.exit(1);
  }
  console.log("Provedores de IA conferidos: protocolo, fluxo, estrutura e limites.\n");
}

void main();
