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
import { PROVEDORES } from "../src/lib/ia/provedores";
import { ErroDeProvedor } from "../src/lib/ia/provedores/tipos";

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

  // --- Groq / OpenRouter (dialeto OpenAI) ---
  if (url.pathname.endsWith("/chat/completions")) {
    if (url.pathname.includes("/cenario-limite/")) {
      return json(res, 429, { error: { message: "rate limit" } });
    }

    const mensagens = enviado.messages as { role: string; content: string }[];
    if (mensagens[0]?.role !== "system") {
      return json(res, 400, { error: { message: "faltou o prompt de sistema" } });
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
