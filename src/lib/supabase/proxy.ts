import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_CONFIGURADO, SUPABASE_URL } from "./config";

/**
 * Renova a sessão do Supabase a cada requisição.
 *
 * O token de acesso expira em cerca de uma hora. Server Components não podem
 * gravar cookies, então sem este passo o usuário seria deslogado no meio de uma
 * sessão de estudo. Aqui, no proxy, a resposta ainda é gravável.
 */
export async function renovarSessao(requisicao: NextRequest): Promise<NextResponse> {
  let resposta = NextResponse.next({ request: requisicao });

  if (!SUPABASE_CONFIGURADO) return resposta;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
    cookies: {
      getAll() {
        return requisicao.cookies.getAll();
      },
      setAll(paraGravar) {
        for (const { name, value } of paraGravar) {
          requisicao.cookies.set(name, value);
        }
        resposta = NextResponse.next({ request: requisicao });
        for (const { name, value, options } of paraGravar) {
          resposta.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() valida o token contra o servidor de autenticação e, de quebra,
  // dispara a renovação quando ele está perto de expirar. getSession() só lê o
  // cookie e confiaria em algo que o navegador pode ter adulterado.
  await supabase.auth.getUser();

  return resposta;
}
