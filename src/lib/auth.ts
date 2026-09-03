import "server-only";

import { redirect } from "next/navigation";
import { PLANO_PADRAO, ehPlano, type Plano } from "./planos";
import { supabaseServidor } from "./supabase/servidor";
import { SUPABASE_CONFIGURADO } from "./supabase/config";

/**
 * Identidade e perfil.
 *
 * A autenticação é do Supabase Auth: e-mail e senha vivem em auth.users e a
 * sessão anda em cookies httpOnly gerenciados por @supabase/ssr. O que é do
 * produto — nome, ambiente, período, grade — fica em tabelas nossas, protegidas
 * por RLS. Nenhuma consulta aqui filtra por usuário na mão: o RLS já faz isso,
 * e o filtro na aplicação seria uma segunda fonte de verdade para errar.
 */

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  ambiente: "estudante" | "profissional";
  /** Decide quais modos de IA a conta enxerga. Ver src/lib/planos.ts. */
  plano: Plano;
}

export interface PerfilEstudante {
  usuario_id: string;
  periodo: number;
  faculdade: string;
  objetivo: string;
  nivel: string;
}

export class ErroDeAutenticacao extends Error {}

const SEM_PROJETO =
  "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e " +
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY) no " +
  ".env.local, ou nas variáveis de ambiente do deploy, e refaça o build — veja o README.";

// ---------------------------------------------------------------------------
// Cadastro e login
// ---------------------------------------------------------------------------

export async function criarConta(entrada: {
  nome: string;
  email: string;
  senha: string;
}): Promise<void> {
  if (!SUPABASE_CONFIGURADO) throw new ErroDeAutenticacao(SEM_PROJETO);

  const supabase = await supabaseServidor();
  const { data, error } = await supabase.auth.signUp({
    email: entrada.email.trim().toLowerCase(),
    password: entrada.senha,
    // O trigger ao_criar_usuario lê este metadata para montar o perfil.
    options: { data: { nome: entrada.nome.trim() } },
  });

  if (error) {
    throw new ErroDeAutenticacao(
      error.message.includes("already registered")
        ? "Já existe uma conta com esse e-mail."
        : error.message,
    );
  }

  // Com confirmação de e-mail ligada no projeto, o cadastro não devolve sessão.
  // Dizer isso é melhor do que redirecionar para uma área que vai expulsá-lo.
  if (!data.session) {
    throw new ErroDeAutenticacao(
      "Conta criada. Confirme o e-mail que enviamos antes de entrar. " +
        "(Para desligar essa etapa, desative a confirmação de e-mail no painel do Supabase.)",
    );
  }
}

export async function autenticar(email: string, senha: string): Promise<void> {
  if (!SUPABASE_CONFIGURADO) throw new ErroDeAutenticacao(SEM_PROJETO);

  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: senha,
  });

  if (error) {
    // O Supabase já devolve mensagem única para e-mail inexistente e senha
    // errada, que é o comportamento certo: não entregamos a um atacante a
    // informação de quais e-mails têm conta.
    throw new ErroDeAutenticacao(
      error.message.includes("Invalid login credentials")
        ? "E-mail ou senha incorretos."
        : error.message,
    );
  }
}

export async function encerrarSessao(): Promise<void> {
  if (!SUPABASE_CONFIGURADO) return;
  const supabase = await supabaseServidor();
  await supabase.auth.signOut();
}

// ---------------------------------------------------------------------------
// Sessão
// ---------------------------------------------------------------------------

export async function usuarioAtual(): Promise<Usuario | null> {
  if (!SUPABASE_CONFIGURADO) return null;

  const supabase = await supabaseServidor();
  // getUser valida o token no servidor de autenticação. getSession leria só o
  // cookie, que o navegador pode ter adulterado.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // meu_perfil, e não perfis: a view resolve o plano considerando assinatura
  // válida. Lendo perfis.plano direto, quem pagasse continuaria no gratuito.
  const { data: perfil } = await supabase
    .from("meu_perfil")
    .select("nome, ambiente, plano")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    // O perfil nasce por trigger no cadastro; o fallback cobre uma conta
    // criada antes da migração do trigger.
    nome: perfil?.nome || (user.user_metadata?.nome as string) || user.email?.split("@")[0] || "",
    ambiente: (perfil?.ambiente as Usuario["ambiente"]) ?? "estudante",
    // Plano desconhecido vira o mais restritivo: um erro de leitura não pode
    // liberar o modo pago.
    plano: ehPlano(perfil?.plano) ? perfil.plano : PLANO_PADRAO,
  };
}

/**
 * Plano da conta atual, para quem precisa dele sem precisar do usuário inteiro.
 *
 * Sem sessão devolve o mais restritivo. Serve aos serviços de geração, que
 * rodam fora do chat e não recebem escolha de modo — sem isto, uma conta Pro
 * num deploy que só tenha a chave paga configurada ficaria sem gerar nada,
 * porque o padrão de escolherProvedor é o plano gratuito.
 */
export async function planoAtual(): Promise<Plano> {
  return (await usuarioAtual())?.plano ?? PLANO_PADRAO;
}

/** Para páginas que só existem logado. Redireciona quando não há sessão. */
export async function exigirUsuario(): Promise<Usuario> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  return usuario;
}

// ---------------------------------------------------------------------------
// Perfil do estudante
// ---------------------------------------------------------------------------

export async function perfilDoEstudante(): Promise<PerfilEstudante | null> {
  if (!SUPABASE_CONFIGURADO) return null;

  const supabase = await supabaseServidor();
  const { data } = await supabase
    .from("perfis_estudante")
    .select("usuario_id, periodo, faculdade, objetivo, nivel")
    .maybeSingle();

  return (data as PerfilEstudante | null) ?? null;
}

export async function salvarPerfilDoEstudante(perfil: PerfilEstudante): Promise<void> {
  const supabase = await supabaseServidor();
  const { error } = await supabase.from("perfis_estudante").upsert(
    {
      usuario_id: perfil.usuario_id,
      periodo: perfil.periodo,
      faculdade: perfil.faculdade,
      objetivo: perfil.objetivo,
      nivel: perfil.nivel,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "usuario_id" },
  );
  if (error) throw new Error(`Não consegui salvar seu perfil: ${error.message}`);
}

export async function disciplinasMatriculadas(): Promise<string[]> {
  if (!SUPABASE_CONFIGURADO) return [];

  const supabase = await supabaseServidor();
  const { data } = await supabase
    .from("matriculas")
    .select("disciplina_slug")
    .order("disciplina_slug");

  return (data ?? []).map((linha) => linha.disciplina_slug as string);
}

export async function definirMatriculas(usuarioId: string, slugs: string[]): Promise<void> {
  const supabase = await supabaseServidor();

  // Sem transação entre chamadas HTTP: apagamos e reinserimos. Uma falha no
  // meio deixa o aluno sem grade, mas ele volta ao onboarding e refaz — pior
  // seria manter disciplina que ele acabou de desmarcar.
  const { error: erroAoLimpar } = await supabase
    .from("matriculas")
    .delete()
    .eq("usuario_id", usuarioId);
  if (erroAoLimpar) throw new Error(`Não consegui atualizar sua grade: ${erroAoLimpar.message}`);

  if (slugs.length === 0) return;

  const { error } = await supabase
    .from("matriculas")
    .insert(slugs.map((slug) => ({ usuario_id: usuarioId, disciplina_slug: slug })));
  if (error) throw new Error(`Não consegui salvar sua grade: ${error.message}`);
}
