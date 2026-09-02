import { createClient } from "@supabase/supabase-js";
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL } from "./config";

/**
 * Diagnóstico da configuração, executado dentro da própria aplicação.
 *
 * A faixa "Supabase não configurado" diz que falta algo, mas não diz o quê: a
 * variável não foi salva, foi salva no ambiente errado, o deploy não foi
 * refeito, a migração não rodou, ou rodou pela metade. São causas diferentes
 * com o mesmo sintoma, e de fora não dá para distinguir.
 *
 * Este módulo responde isso de dentro do processo que está no ar — é a mesma
 * bateria de `npm run verificar:conexao`, disponível também como página, para
 * quem não tem terminal apontado para o deploy.
 *
 * O que ele NUNCA revela: o valor de chave nenhuma. Só presença, origem e
 * formato. A URL do projeto e o prefixo da chave publicável já vão no bundle do
 * navegador — não há nada aqui que um visitante não pudesse descobrir sozinho.
 *
 * Sem `server-only` de propósito: o mesmo módulo é a fonte de `npm run
 * verificar:conexao`, que roda em Node puro. Duas cópias da mesma bateria já
 * divergiram uma vez neste repositório (o script exigia a chave anon depois que
 * a aplicação passou a aceitar a publishable), e o custo foi um teste que se
 * pulava sozinho sem ninguém notar.
 */

export type Estado = "ok" | "aviso" | "falha";

export type Checagem = {
  titulo: string;
  estado: Estado;
  detalhe?: string;
};

export type Diagnostico = {
  checagens: Checagem[];
  estado: Estado;
  resumo: string;
  passos: string[];
};

/** As mesmas tabelas que a migração inicial cria. */
const TABELAS = [
  "perfis",
  "perfis_estudante",
  "matriculas",
  "conversas",
  "mensagens",
  "simulados",
  "documentos",
  "roteiros",
  "planos_estudo",
] as const;

const ONDE = "no .env.local em desenvolvimento, ou nas variáveis de ambiente do deploy " +
  "(na Vercel, marcando também o ambiente Production)";

const REFAZER =
  "Refaça o build depois de salvar — num deploy, um redeploy: as variáveis NEXT_PUBLIC_ " +
  "entram no bundle na hora de compilar, então salvar sem recompilar não muda nada.";

/** Mostra o suficiente para reconhecer a chave, nunca o bastante para usá-la. */
function mascarar(chave: string): string {
  if (chave.startsWith("sb_publishable_")) return "sb_publishable_…";
  if (chave.startsWith("sb_secret_")) return "sb_secret_…";
  if (chave.startsWith("eyJ")) return "eyJ… (JWT)";
  return `${chave.slice(0, 3)}…`;
}

/** A service_role ignora o RLS. Se ela chegou aqui, é o problema mais grave. */
function ehServiceRole(chave: string): boolean {
  if (chave.startsWith("sb_secret_")) return true;
  try {
    const payload = JSON.parse(
      Buffer.from(chave.split(".")[1] ?? "", "base64url").toString(),
    ) as { role?: string };
    return payload.role === "service_role";
  } catch {
    // Chave publicável nova não é JWT — não dá para ler papel, e nem precisa.
    return false;
  }
}

export async function diagnosticar(): Promise<Diagnostico> {
  const checagens: Checagem[] = [];
  const passos: string[] = [];

  // -----------------------------------------------------------------------
  // 1. O build recebeu as variáveis?
  // -----------------------------------------------------------------------
  const daPublishable = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").length > 0;
  const daAnon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").length > 0;

  if (SUPABASE_URL) {
    checagens.push({ titulo: "NEXT_PUBLIC_SUPABASE_URL", estado: "ok", detalhe: SUPABASE_URL });
  } else {
    checagens.push({
      titulo: "NEXT_PUBLIC_SUPABASE_URL",
      estado: "falha",
      detalhe: "ausente neste build",
    });
    passos.push(`Defina NEXT_PUBLIC_SUPABASE_URL (https://<ref>.supabase.co) ${ONDE}.`);
  }

  if (SUPABASE_CHAVE_PUBLICA) {
    checagens.push({
      titulo: daPublishable
        ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
        : "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      estado: "ok",
      detalhe: `presente — ${mascarar(SUPABASE_CHAVE_PUBLICA)}`,
    });
    if (daPublishable && daAnon) {
      checagens.push({
        titulo: "duas chaves definidas",
        estado: "aviso",
        detalhe: "a publishable tem precedência; a anon está sendo ignorada",
      });
    }
    if (ehServiceRole(SUPABASE_CHAVE_PUBLICA)) {
      checagens.push({
        titulo: "a chave configurada é a SERVICE_ROLE",
        estado: "falha",
        detalhe:
          "ela ignora o RLS e está indo para o navegador — troque AGORA pela chave " +
          "publishable/anon e gere uma service_role nova no painel",
      });
      passos.unshift(
        "URGENTE: substitua a chave por uma publishable (sb_publishable_…) ou anon, e " +
          "revogue a service_role exposta no painel do Supabase.",
      );
    }
  } else {
    checagens.push({
      titulo: "chave pública do Supabase",
      estado: "falha",
      detalhe: "nem NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY nem NEXT_PUBLIC_SUPABASE_ANON_KEY",
    });
    passos.push(
      `Defina NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (painel do Supabase → Project Settings → ` +
        `API Keys) ${ONDE}.`,
    );
  }

  checagens.push({
    titulo: "ANTHROPIC_API_KEY",
    estado: process.env.ANTHROPIC_API_KEY ? "ok" : "aviso",
    detalhe: process.env.ANTHROPIC_API_KEY
      ? "presente — o modelo responde"
      : "ausente — a plataforma roda em modo demonstração e avisa em vez de inventar",
  });

  if (!SUPABASE_URL || !SUPABASE_CHAVE_PUBLICA) {
    passos.push(REFAZER);
    return {
      checagens,
      estado: "falha",
      resumo: "A configuração do Supabase não chegou a este build.",
      passos,
    };
  }

  // -----------------------------------------------------------------------
  // 2. O projeto responde?
  // -----------------------------------------------------------------------
  try {
    const resposta = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/health`, {
      headers: { apikey: SUPABASE_CHAVE_PUBLICA },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (resposta.ok) {
      checagens.push({ titulo: "o projeto responde", estado: "ok", detalhe: "/auth/v1/health" });
    } else {
      checagens.push({
        titulo: "o projeto respondeu com erro",
        estado: "falha",
        detalhe: `HTTP ${resposta.status} em /auth/v1/health — confira a URL e a chave`,
      });
      passos.push("Confira se a URL e a chave são do mesmo projeto Supabase.");
      return {
        checagens,
        estado: "falha",
        resumo: "O projeto Supabase recusou a chave configurada.",
        passos,
      };
    }
  } catch (erro) {
    const causa = erro instanceof Error ? erro.message : String(erro);
    checagens.push({ titulo: "não alcancei o projeto", estado: "falha", detalhe: causa });
    passos.push(
      "Confira se o projeto Supabase está ativo (projetos gratuitos pausam por inatividade) " +
        "e se a URL está correta.",
    );
    return {
      checagens,
      estado: "falha",
      resumo: "Não foi possível alcançar o projeto Supabase.",
      passos,
    };
  }

  // -----------------------------------------------------------------------
  // 3. Migração aplicada e acesso anônimo negado
  //
  // Consulta SEM sessão: o resultado desejado é "permission denied" em todas.
  // "0 linhas" não serve — significa que o grant a anon continua de pé e a
  // segurança depende só de as políticas nunca ficarem permissivas demais.
  // -----------------------------------------------------------------------
  const supabase = createClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let negadas = 0;
  let faltando = 0;
  let expostas = 0;

  for (const tabela of TABELAS) {
    const { data, error } = await supabase.from(tabela).select("*").limit(1);

    if (error) {
      const codigo = error.code ?? "";
      const texto = `${codigo} ${error.message}`.toLowerCase();

      if (codigo === "42501" || texto.includes("permission denied")) {
        negadas += 1;
      } else if (
        codigo === "42P01" ||
        codigo === "PGRST205" ||
        texto.includes("does not exist") ||
        texto.includes("could not find the table")
      ) {
        faltando += 1;
      } else {
        checagens.push({
          titulo: `${tabela}: erro inesperado`,
          estado: "falha",
          detalhe: `${codigo} — ${error.message}`,
        });
      }
      continue;
    }

    if ((data ?? []).length > 0) {
      expostas += 1;
      checagens.push({
        titulo: `${tabela}: DEVOLVEU DADO SEM SESSÃO`,
        estado: "falha",
        detalhe: "qualquer pessoa com a chave pública lê esta tabela",
      });
    } else {
      checagens.push({
        titulo: `${tabela}: consulta anônima aceita (0 linhas)`,
        estado: "falha",
        detalhe: "esperado 'permission denied' — a migração pode ter rodado sem o REVOKE de anon",
      });
    }
  }

  if (negadas > 0) {
    checagens.push({
      titulo: `${negadas} de ${TABELAS.length} tabelas negam acesso anônimo`,
      estado: negadas === TABELAS.length ? "ok" : "aviso",
      detalhe: "é o resultado desejado: a tabela existe e ninguém a lê sem sessão",
    });
  }

  if (expostas > 0) {
    passos.unshift(
      "URGENTE: reaplique supabase/migrations por inteiro — há tabela legível sem sessão.",
    );
    return {
      checagens,
      estado: "falha",
      resumo: `${expostas} tabela(s) devolvem dado sem sessão. Não use este projeto em produção.`,
      passos,
    };
  }

  if (faltando === TABELAS.length) {
    checagens.push({
      titulo: "nenhuma tabela existe",
      estado: "falha",
      detalhe: "a migração inicial não foi aplicada neste projeto",
    });
    passos.push(
      "Rode supabase/migrations/20260902060000_esquema_inicial.sql no SQL Editor do painel.",
    );
    passos.push(
      "Em seguida rode supabase/migrations/20260902140000_perfil_sem_email.sql — sem ela, um " +
        "cadastro sem e-mail derruba o signup inteiro.",
    );
    return { checagens, estado: "falha", resumo: "O banco está vazio.", passos };
  }

  if (faltando > 0) {
    checagens.push({
      titulo: `${faltando} tabela(s) não existem`,
      estado: "falha",
      detalhe: "a migração rodou pela metade",
    });
    passos.push("Reaplique supabase/migrations na ordem do nome do arquivo.");
    return { checagens, estado: "falha", resumo: "A migração está incompleta.", passos };
  }

  const houveFalha = checagens.some((c) => c.estado === "falha");
  return {
    checagens,
    estado: houveFalha ? "falha" : "ok",
    resumo: houveFalha
      ? "A configuração chegou, mas há problemas no banco."
      : "Configuração, schema e isolamento anônimo conferidos.",
    passos: houveFalha
      ? passos
      : [
          "Falta só conferir o trigger de cadastro: se ainda não rodou, aplique " +
            "supabase/migrations/20260902140000_perfil_sem_email.sql.",
        ],
  };
}
