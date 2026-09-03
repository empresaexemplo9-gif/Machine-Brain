/**
 * Remoção das contas que a suíte de fluxos cria.
 *
 * Sem isto, cada execução deixava uma conta permanente no banco — e como o
 * único projeto disponível é o de produção, o lixo se acumularia junto dos
 * dados reais. Com isto, a suíte devolve o banco ao estado em que o encontrou.
 *
 * A remoção tem DUAS travas, e as duas precisam passar para um usuário ser
 * apagado:
 *
 *   1. O e-mail tem que estar na lista que ESTA execução criou.
 *   2. O e-mail tem que casar com o padrão de conta de teste.
 *
 * A primeira sozinha bastaria se o rastreamento nunca falhasse. A segunda
 * existe porque ele pode falhar — um bug meu, uma variável trocada — e o custo
 * do erro aqui é apagar a conta de um usuário real. Duas travas independentes
 * transformam esse erro em "não apagou nada".
 *
 * Exige a chave service_role, porque só ela pode remover usuários. Ela vive
 * como secret do CI: nunca no bundle do navegador, nunca no código.
 */

/** Exatamente o formato que a suíte gera: verificacao<timestamp>@exemplo.com */
export const PADRAO_CONTA_DE_TESTE = /^verificacao\d{10,}@exemplo\.com$/;

export function ehContaDeTeste(email) {
  return typeof email === "string" && PADRAO_CONTA_DE_TESTE.test(email.trim().toLowerCase());
}

/**
 * Apaga as contas informadas. Devolve o que fez, para quem chama poder relatar.
 *
 * `recusados` é a informação mais importante do retorno: um e-mail que a
 * execução diz ter criado mas que não passa no padrão indica rastreamento
 * furado — vale mais aparecer no log do que ser apagado em silêncio.
 */
export async function apagarContasDeTeste({
  url,
  chaveServico,
  emails,
  buscar = fetch,
  porPagina = 200,
  maxPaginas = 20,
}) {
  const alvo = new Set(
    (emails ?? []).map((e) => String(e).trim().toLowerCase()).filter(Boolean),
  );
  const resultado = { pulou: false, apagados: [], recusados: [], naoEncontrados: [], falhas: [] };

  if (alvo.size === 0) return resultado;
  if (!chaveServico) {
    resultado.pulou = true;
    return resultado;
  }

  const base = String(url).replace(/\/$/, "");
  const cabecalhos = { apikey: chaveServico, authorization: `Bearer ${chaveServico}` };

  // Precisamos do id para apagar, e o cadastro pela interface não o devolve.
  const porEmail = new Map();
  for (let pagina = 1; pagina <= maxPaginas; pagina += 1) {
    const resposta = await buscar(
      `${base}/auth/v1/admin/users?page=${pagina}&per_page=${porPagina}`,
      { headers: cabecalhos, signal: AbortSignal.timeout(20_000) },
    );
    if (!resposta.ok) {
      resultado.falhas.push(`listagem de usuários: HTTP ${resposta.status}`);
      return resultado;
    }
    const corpo = await resposta.json();
    const usuarios = Array.isArray(corpo) ? corpo : (corpo.users ?? []);
    for (const u of usuarios) {
      if (u?.email) porEmail.set(String(u.email).trim().toLowerCase(), u.id);
    }
    if (usuarios.length < porPagina) break;
  }

  for (const email of alvo) {
    // Trava 2: mesmo constando da lista desta execução, o padrão tem que bater.
    if (!ehContaDeTeste(email)) {
      resultado.recusados.push(email);
      continue;
    }
    const id = porEmail.get(email);
    if (!id) {
      resultado.naoEncontrados.push(email);
      continue;
    }
    const resposta = await buscar(`${base}/auth/v1/admin/users/${id}`, {
      method: "DELETE",
      headers: cabecalhos,
      signal: AbortSignal.timeout(20_000),
    });
    if (resposta.ok) resultado.apagados.push(email);
    else resultado.falhas.push(`${email}: HTTP ${resposta.status}`);
  }

  return resultado;
}
