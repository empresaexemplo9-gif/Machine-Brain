import "server-only";

import { MODOS_IA, descreverModo, type ModoIA } from "../modos";
import { PLANO_PADRAO, modosDoPlano, type Plano } from "../../planos";
import { criarProvedorOpenAI } from "./openai-compat";
import { provedorGemini } from "./gemini";
import { provedorAnthropic } from "./anthropic";
import type { Provedor } from "./tipos";

/**
 * Registro dos provedores e escolha do modo.
 *
 * A ordem de MODOS_IA é a ordem de preferência quando ninguém escolheu: os
 * gratuitos primeiro, o pago por último. Assim a plataforma funciona com
 * qualquer uma das chaves presentes, e não gasta a paga sem alguém pedir.
 */

export const PROVEDORES: Record<ModoIA, Provedor> = {
  estudo: criarProvedorOpenAI({
    id: "estudo",
    rotulo: "Estudo",
    base: "https://api.groq.com/openai/v1",
    variavelBase: "MB_BASE_GROQ",
    variavelChave: "GROQ_API_KEY",
    variavelModelo: "MB_MODEL_GROQ",
    prefixoAjustes: "MB_GROQ",
    // Tudo na Groq tem nível gratuito; o que muda é a qualidade. Famílias, não
    // versões: o provedor troca 3.3 por 4 sem avisar.
    preferidos: ["llama-3.3-70b", "llama-4", "llama-3.1-70b", "qwen", "llama", "gemma"],
    modeloPadrao: "llama-3.3-70b-versatile",
  }),
  pesquisa: provedorGemini,
  debate: criarProvedorOpenAI({
    id: "debate",
    rotulo: "Debate",
    base: "https://openrouter.ai/api/v1",
    variavelBase: "MB_BASE_OPENROUTER",
    variavelChave: "OPENROUTER_API_KEY",
    variavelModelo: "MB_MODEL_OPENROUTER",
    prefixoAjustes: "MB_OPENROUTER",
    // No OpenRouter a maioria dos modelos é paga: só entram os de preço zero.
    apenasGratuitos: true,
    preferidos: [":free", "llama", "qwen", "deepseek", "mistral", "gemma"],
    modeloPadrao: "meta-llama/llama-3.3-70b-instruct:free",
    // O OpenRouter usa estes cabeçalhos para atribuir o tráfego à aplicação.
    cabecalhosExtra: {
      "http-referer": "https://machine-brain.vercel.app",
      "x-title": "DRAP Jurídico",
    },
  }),
  parecer: provedorAnthropic,
};

/**
 * Modos que este usuário pode usar: com chave configurada E autorizados pelo
 * plano. As duas condições, sempre — chave sem plano oferece o que o usuário
 * não comprou; plano sem chave oferece o que não responde.
 */
export function modosDisponiveis(plano: Plano = PLANO_PADRAO): ModoIA[] {
  const doPlano = modosDoPlano(plano);
  return MODOS_IA.filter(
    (m) => doPlano.includes(m.id) && PROVEDORES[m.id].disponivel(),
  ).map((m) => m.id);
}

/**
 * Nenhuma chave em lugar nenhum: a plataforma roda em demonstração.
 *
 * Ignora o plano de propósito: o aviso de demonstração é sobre a configuração
 * do deploy, não sobre o que este usuário comprou.
 */
export function semNenhumaChave(): boolean {
  return MODOS_IA.every((m) => !PROVEDORES[m.id].disponivel());
}

/**
 * Resolve o modo a usar.
 *
 * Um modo pedido mas sem chave não vira erro: cai no primeiro disponível. O
 * usuário escolheu "Debate" porque queria contraponto, não porque queria falha —
 * e a interface só oferece os disponíveis, então isso é rede de proteção para
 * requisição fora dela, não caminho normal.
 */
export function escolherProvedor(pedido?: ModoIA, plano: Plano = PLANO_PADRAO): Provedor | null {
  const disponiveis = modosDisponiveis(plano);
  if (disponiveis.length === 0) return null;
  // Um pedido fora da lista cai no primeiro permitido em vez de virar erro. É
  // aqui que o plano é REALMENTE aplicado: a interface não oferece o modo pago
  // a quem não tem, mas quem monta a requisição à mão também não o alcança.
  const escolhido = pedido && disponiveis.includes(pedido) ? pedido : disponiveis[0];
  return PROVEDORES[escolhido];
}

/** Linha do diagnóstico: modo, provedor, modelo e se está ligado. */
export function estadoDosModos(): {
  id: ModoIA;
  rotulo: string;
  provedor: string;
  variavelChave: string;
  modelo: string;
  disponivel: boolean;
}[] {
  return MODOS_IA.map((m) => {
    const p = PROVEDORES[m.id];
    const descricao = descreverModo(m.id);
    return {
      id: m.id,
      rotulo: descricao.rotulo,
      provedor: descricao.provedor,
      variavelChave: p.variavelChave,
      modelo: p.modelo(),
      disponivel: p.disponivel(),
    };
  });
}
