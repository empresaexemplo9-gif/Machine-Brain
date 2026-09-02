/**
 * Endereço e chave pública do projeto Supabase.
 *
 * Fica fora dos módulos `server-only` porque o proxy (Edge) também lê estes
 * valores. Não existe cliente Supabase de navegador nesta aplicação — todo
 * acesso ao banco acontece no servidor, com a sessão do usuário nos cookies.
 *
 * É por isso que o prefixo NEXT_PUBLIC_ não é obrigatório aqui: ele serve para
 * embutir a variável no bundle do navegador, e não há bundle de navegador que
 * precise dela. Os nomes sem prefixo são lidos em tempo de execução, o que tem
 * uma vantagem prática — trocar o valor no painel e refazer o deploy basta, sem
 * depender de o build ter recebido a variável na hora de compilar.
 *
 * A ordem abaixo aceita os nomes que aparecem na prática: os do .env.example, os
 * equivalentes sem prefixo, e os terminados em _DEV, que são os nomes dos
 * secrets do CI e acabam reaproveitados no painel do deploy.
 */

/** Primeiro valor não vazio. Espaço em volta é aparado: colar chave no painel costuma trazer. */
function primeiro(...valores: (string | undefined)[]): string {
  for (const valor of valores) {
    const limpo = valor?.trim() ?? "";
    if (limpo.length > 0) return limpo;
  }
  return "";
}

export const SUPABASE_URL = primeiro(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_URL,
  process.env.SUPABASE_URL_DEV,
);

/**
 * A chave PÚBLICA — publishable (sb_publishable_...) ou anon (JWT). Nunca a
 * service_role: ela ignora o RLS, e o RLS é a única coisa que impede um usuário
 * de ler os dados de outro nesta arquitetura.
 */
const CHAVE_CONFIGURADA = primeiro(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  process.env.SUPABASE_PUBLISHABLE_KEY,
  process.env.SUPABASE_ANON_KEY,
  process.env.SUPABASE_ANON_KEY_DEV,
);

/**
 * A service_role tem o formato sb_secret_... ou um JWT com role "service_role".
 *
 * Se alguém colar uma dessas no campo da chave pública, a aplicação inteira
 * passa a falar com o banco por cima do RLS — e aí uma consulta com escopo
 * errado deixa de devolver "nenhuma linha" e passa a devolver a linha dos
 * outros. Preferimos recusar e mostrar o aviso de configuração a rodar assim.
 */
export function ehChaveSecreta(chave: string): boolean {
  if (chave.startsWith("sb_secret_")) return true;
  const payload = chave.split(".")[1];
  if (!payload) return false;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/")) as string;
    return (JSON.parse(json) as { role?: string }).role === "service_role";
  } catch {
    // Chave publicável nova não é JWT — não há papel para ler, e nem precisa.
    return false;
  }
}

export const CHAVE_SECRETA_NO_LUGAR_DA_PUBLICA =
  CHAVE_CONFIGURADA.length > 0 && ehChaveSecreta(CHAVE_CONFIGURADA);

export const SUPABASE_CHAVE_PUBLICA = CHAVE_SECRETA_NO_LUGAR_DA_PUBLICA
  ? ""
  : CHAVE_CONFIGURADA;

/**
 * Sem projeto configurado a aplicação continua subindo, mas diz o que falta em
 * vez de estourar um erro de conexão em cima do usuário.
 */
export const SUPABASE_CONFIGURADO =
  SUPABASE_URL.length > 0 && SUPABASE_CHAVE_PUBLICA.length > 0;
