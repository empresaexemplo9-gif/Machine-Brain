import { NextResponse } from "next/server";
import { z } from "zod";
import { IDS_MODOS, descreverModo } from "@/lib/ia/modos";
import { PROVEDORES } from "@/lib/ia/provedores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Testa um modo de IA com uma chamada real, a partir do deploy.
 *
 * Existe porque o ambiente de desenvolvimento nem sempre alcança as APIs dos
 * provedores — e o deploy alcança. Sem isto, "o modelo não responde" só se
 * descobre errando na cara do usuário, e sem saber se a causa é chave inválida,
 * modelo inexistente ou cota estourada. São erros diferentes com o mesmo
 * sintoma, e o provedor distingue os três: aqui a mensagem dele é repassada.
 *
 * Limitado a 16 tokens e a uma chamada por modo a cada 30 segundos: a página é
 * pública, e sem isso alguém queimaria a cota gratuita recarregando.
 */

const Entrada = z.object({ modo: z.enum(IDS_MODOS) });

const ultimoTeste = new Map<string, number>();
const ESPERA_MS = 30_000;

export async function POST(requisicao: Request) {
  const corpo = Entrada.safeParse(await requisicao.json().catch(() => null));
  if (!corpo.success) {
    return NextResponse.json({ erro: "Modo inválido." }, { status: 400 });
  }

  const { modo } = corpo.data;
  const descricao = descreverModo(modo);
  const provedor = PROVEDORES[modo];

  if (!provedor.disponivel()) {
    return NextResponse.json({
      ok: false,
      mensagem: `${descricao.variavelChave} não está definida neste deploy.`,
    });
  }

  const agora = Date.now();
  const anterior = ultimoTeste.get(modo) ?? 0;
  if (agora - anterior < ESPERA_MS) {
    const faltam = Math.ceil((ESPERA_MS - (agora - anterior)) / 1000);
    return NextResponse.json({
      ok: false,
      mensagem: `Aguarde ${faltam}s para testar este modo de novo.`,
    });
  }
  ultimoTeste.set(modo, agora);

  const inicio = Date.now();
  try {
    const texto = await provedor.responder({
      sistema: "Responda com uma única palavra.",
      turnos: [{ papel: "user", conteudo: "Diga: funcionando" }],
      maxTokens: 16,
      temperatura: 0,
    });
    const ms = Date.now() - inicio;
    // Depois da chamada o modelo já está resolvido: se veio da descoberta, é
    // aqui que se vê qual foi. É a pergunta que mais importa quando alguém
    // configurou um id que o provedor aposentou.
    return NextResponse.json({
      ok: true,
      mensagem: `Respondeu em ${ms}ms — modelo ${await provedor.resolverModelo()}.`,
      amostra: texto.trim().slice(0, 80),
    });
  } catch (erro) {
    // A mensagem do provedor é o dado útil: ela distingue chave recusada de
    // modelo inexistente de cota estourada. Repassar é melhor que resumir —
    // mas quando ela nomeia uma variável que resolve, dizer qual é economiza
    // uma busca na documentação.
    const original = erro instanceof Error ? erro.message : "Falha inesperada.";
    return NextResponse.json({ ok: false, mensagem: `${original}${dica(original)}` });
  }
}

/** Traduz erros conhecidos em "defina esta variável". */
function dica(mensagem: string): string {
  const texto = mensagem.toLowerCase();
  if (texto.includes("anthropic-workspace-id")) {
    return " → defina ANTHROPIC_WORKSPACE_ID com o id do workspace (o painel da Anthropic mostra em Settings → Workspaces).";
  }
  if (texto.includes("temperature")) {
    return " → o modelo não aceita temperature; a plataforma já não a envia, então isto indica build antiga: refaça o deploy.";
  }
  if (texto.includes("credit") || texto.includes("billing") || texto.includes("insufficient")) {
    return " → é cobrança, não configuração: a conta do provedor precisa de saldo.";
  }
  return "";
}
