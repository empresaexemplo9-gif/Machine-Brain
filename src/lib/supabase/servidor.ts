import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_CONFIGURADO, SUPABASE_URL } from "./config";

/**
 * Cliente Supabase do lado do servidor, ligado aos cookies da requisição.
 *
 * É sempre este cliente que fala com o banco — nunca a service role. Isso é
 * deliberado: com a chave pública e o JWT do usuário nos cookies, toda consulta
 * atravessa o RLS. Uma falha de escopo no código vira "nenhuma linha", não
 * vazamento. A service role burlaria o RLS e transformaria cada `select` em
 * algo que precisa estar certo por conta própria.
 */
export async function supabaseServidor(): Promise<SupabaseClient> {
  const jar = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
    cookies: {
      getAll() {
        return jar.getAll();
      },
      setAll(paraGravar) {
        try {
          for (const { name, value, options } of paraGravar) {
            jar.set(name, value, options);
          }
        } catch {
          // Server Components não podem gravar cookies. Quem renova a sessão é
          // o proxy (src/proxy.ts), então aqui a falha é esperada e inofensiva.
        }
      },
    },
  });
}

export class ErroDeConfiguracao extends Error {}

/** Para caminhos que não fazem sentido sem projeto configurado. */
export function exigirSupabaseConfigurado(): void {
  if (!SUPABASE_CONFIGURADO) {
    throw new ErroDeConfiguracao(
      "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY) " +
        "no .env.local, ou nas variáveis de ambiente do deploy, e refaça o build " +
        "(veja .env.example).",
    );
  }
}
