/**
 * Endereço e chave pública do projeto Supabase.
 *
 * Fica fora dos módulos `server-only` porque o middleware e um eventual cliente
 * de navegador também precisam ler estes valores. São públicos por natureza: a
 * chave anon/publishable não dá acesso a nada sozinha — quem separa os dados de
 * um usuário dos do outro é o RLS, definido em supabase/migrations.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export const SUPABASE_CHAVE_PUBLICA =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

/**
 * Sem projeto configurado a aplicação continua subindo, mas diz o que falta em
 * vez de estourar um erro de conexão em cima do usuário.
 */
export const SUPABASE_CONFIGURADO =
  SUPABASE_URL.length > 0 && SUPABASE_CHAVE_PUBLICA.length > 0;
