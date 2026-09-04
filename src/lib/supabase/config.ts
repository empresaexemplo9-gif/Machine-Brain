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

/**
 * A URL e a chave viram cabeçalho HTTP (`apikey`, `Authorization`) na primeira
 * chamada ao Supabase. Cabeçalho só aceita Latin-1: um caractere acima de 255
 * faz o fetch estourar com
 *
 *   "Cannot convert argument to a ByteString because the character at index N
 *    has a value of 8212 which is greater than 255"
 *
 * 8212 é o travessão "—". Ele chega ali quando o valor é colado no painel com
 * texto grudado — uma linha de documentação, uma legenda, o rótulo junto do
 * valor. O erro cru não diz qual variável nem o que houve, e some no meio de um
 * stack trace de biblioteca.
 *
 * Detectar aqui troca esse erro por uma frase que nomeia a variável e o
 * caractere. É a diferença entre "a plataforma quebrou" e "sobrou texto colado
 * na variável X".
 */
export interface DefeitoDeVariavel {
  variavel: string;
  posicao: number;
  caractere: string;
  codigo: number;
}

function acharCaractereInvalido(valor: string, variavel: string): DefeitoDeVariavel | null {
  for (let i = 0; i < valor.length; i += 1) {
    const codigo = valor.codePointAt(i) ?? 0;
    if (codigo > 255) {
      return { variavel, posicao: i, caractere: valor[i], codigo };
    }
  }
  return null;
}

const URL_CONFIGURADA = primeiro(
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

/**
 * Defeitos que impedem o valor de virar cabeçalho. Vazio = nada a relatar.
 *
 * A variável é nomeada pelo nome que o painel mostra, não pela interna: quem
 * vai consertar está olhando para o painel.
 */
/**
 * Ref do projeto — o subdomínio de https://<ref>.supabase.co.
 *
 * Serve para cruzar com o ref que a chave carrega e detectar o par trocado:
 * URL de um projeto com chave de outro. O Supabase responde a isso com
 * "Invalid API key", que não diz qual das duas está errada.
 */
export function refDaUrl(url: string): string | null {
  return /^https:\/\/([a-z0-9-]+)\.supabase\.(co|in)\/?$/.exec(url.trim())?.[1] ?? null;
}

/**
 * Ref embutido na chave anon legada (JWT).
 *
 * A chave publicável nova (sb_publishable_...) é opaca e não carrega o ref, de
 * modo que este cruzamento só funciona com a legada. Vale mesmo assim: é
 * justamente quem migrou de projeto que costuma ter as duas na mão.
 */
export function refDaChave(chave: string): string | null {
  const payload = chave.split(".")[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/")) as string;
    const ref = (JSON.parse(json) as { ref?: string }).ref;
    return typeof ref === "string" && ref.length > 0 ? ref : null;
  } catch {
    return null;
  }
}

export const VARIAVEIS_COM_CARACTERE_INVALIDO: DefeitoDeVariavel[] = [
  acharCaractereInvalido(URL_CONFIGURADA, "a URL do Supabase"),
  acharCaractereInvalido(CHAVE_CONFIGURADA, "a chave pública do Supabase"),
].filter((d): d is DefeitoDeVariavel => d !== null);

/** Valor inválido é tratado como ausente: melhor o aviso do que o erro cru. */
const URL_UTILIZAVEL = acharCaractereInvalido(URL_CONFIGURADA, "") === null;
const CHAVE_UTILIZAVEL = acharCaractereInvalido(CHAVE_CONFIGURADA, "") === null;

export const SUPABASE_URL = URL_UTILIZAVEL ? URL_CONFIGURADA : "";

export const SUPABASE_CHAVE_PUBLICA =
  CHAVE_SECRETA_NO_LUGAR_DA_PUBLICA || !CHAVE_UTILIZAVEL ? "" : CHAVE_CONFIGURADA;

/**
 * Sem projeto configurado a aplicação continua subindo, mas diz o que falta em
 * vez de estourar um erro de conexão em cima do usuário.
 */
export const SUPABASE_CONFIGURADO =
  SUPABASE_URL.length > 0 && SUPABASE_CHAVE_PUBLICA.length > 0;
