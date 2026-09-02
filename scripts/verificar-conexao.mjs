/**
 * Diagnóstico da conexão com o Supabase.
 *
 * Responde três perguntas, nesta ordem, e diz qual falhou:
 *   1. As variáveis estão definidas e o projeto responde?
 *   2. A migração foi aplicada? (as tabelas existem)
 *   3. O acesso anônimo está bloqueado? (o RLS e os grants pegaram)
 *
 * A terceira é a que importa de verdade. Se uma consulta SEM SESSÃO devolver
 * linhas, o banco está aberto para qualquer um com a chave pública — que vai no
 * bundle do navegador. Nesse caso o script falha alto, porque é o único erro
 * aqui capaz de vazar dado de aluno e de processo.
 *
 *   npm run verificar:conexao
 */
import { createClient } from "@supabase/supabase-js";

const URL_PROJETO = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const CHAVE =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

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
];

let problemas = 0;
const falhar = (msg, detalhe) => {
  problemas += 1;
  console.log(`  ✗ ${msg}`);
  if (detalhe) console.log(`      ${detalhe}`);
};
const ok = (msg) => console.log(`  ✓ ${msg}`);

// --------------------------------------------------------------------------
// 1. Configuração
// --------------------------------------------------------------------------
console.log("\nConfiguração");

if (!URL_PROJETO || !CHAVE) {
  console.log(
    "  ✗ variáveis ausentes\n" +
      "      Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY\n" +
      "      em .env.local (Painel do Supabase → Project Settings → API).\n",
  );
  process.exit(1);
}
if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/.test(URL_PROJETO.replace(/\/$/, ""))) {
  console.log(`  ! URL fora do formato esperado: ${URL_PROJETO}`);
  console.log("      Esperado algo como https://abcdefghijkl.supabase.co");
}
// A service_role tem "service_role" no payload do JWT e ignora o RLS. Ela nunca
// deve aparecer aqui — nem no .env.local, nem em lugar nenhum desta aplicação.
try {
  const payload = JSON.parse(Buffer.from(CHAVE.split(".")[1] ?? "", "base64url").toString());
  if (payload.role === "service_role") {
    falhar(
      "a chave configurada é a SERVICE_ROLE",
      "Ela ignora o RLS e não pode ir para o cliente. Troque pela chave anon/publishable.",
    );
  } else {
    ok(`chave com papel "${payload.role ?? "desconhecido"}"`);
  }
} catch {
  // Chaves publishable novas (sb_publishable_...) não são JWT. Sem problema.
  ok("chave publicável (formato novo)");
}
ok(`projeto: ${URL_PROJETO}`);

// --------------------------------------------------------------------------
// 2. O projeto responde
// --------------------------------------------------------------------------
console.log("\nAlcance do projeto");
try {
  const resposta = await fetch(`${URL_PROJETO.replace(/\/$/, "")}/auth/v1/health`, {
    headers: { apikey: CHAVE },
    signal: AbortSignal.timeout(15000),
  });
  if (resposta.ok) ok("serviço de autenticação respondeu");
  else falhar(`serviço de autenticação devolveu HTTP ${resposta.status}`);
} catch (erro) {
  falhar("não consegui alcançar o projeto", erro.message);
  console.log("\nInterrompendo: sem alcançar o projeto, o resto não diz nada.\n");
  process.exit(1);
}

// --------------------------------------------------------------------------
// 3. Migração aplicada e acesso anônimo bloqueado
// --------------------------------------------------------------------------
console.log("\nSchema e isolamento (consultando SEM sessão)");

const supabase = createClient(URL_PROJETO, CHAVE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let faltando = 0;
let expostas = 0;

for (const tabela of TABELAS) {
  const { data, error } = await supabase.from(tabela).select("*").limit(1);

  if (error) {
    const codigo = error.code ?? "";
    const texto = `${codigo} ${error.message}`.toLowerCase();

    if (codigo === "42501" || texto.includes("permission denied")) {
      // Resultado desejado: a tabela existe e o papel anon não a alcança.
      ok(`${tabela}: acesso anônimo negado`);
    } else if (
      codigo === "42P01" ||
      codigo === "PGRST205" ||
      texto.includes("does not exist") ||
      texto.includes("could not find the table")
    ) {
      faltando += 1;
      falhar(`${tabela}: tabela não existe`, error.message);
    } else {
      falhar(`${tabela}: erro inesperado`, `${codigo} — ${error.message}`);
    }
    continue;
  }

  if ((data ?? []).length > 0) {
    expostas += 1;
    falhar(
      `${tabela}: DEVOLVEU DADO SEM SESSÃO`,
      "qualquer pessoa com a chave pública (que vai no bundle) lê esta tabela",
    );
  } else {
    // Sem erro e sem linhas: o RLS filtrou, mas o grant a anon continua de pé.
    // Não vaza hoje; vaza no dia em que uma política nova for permissiva demais.
    falhar(
      `${tabela}: consulta anônima foi aceita (0 linhas)`,
      "esperado 'permission denied' — confira se a migração rodou inteira, incluindo o REVOKE de anon",
    );
  }
}

// --------------------------------------------------------------------------
console.log("");
if (expostas > 0) {
  console.log(
    `FALHA GRAVE: ${expostas} tabela(s) devolveram dado sem sessão.\n` +
      "Não coloque este projeto em produção. Reaplique supabase/migrations por inteiro.\n",
  );
  process.exit(1);
}
if (faltando === TABELAS.length) {
  console.log(
    "A migração não foi aplicada: nenhuma tabela existe.\n" +
      "Rode supabase/migrations/20260902060000_esquema_inicial.sql no SQL Editor\n" +
      "do painel, ou `supabase db push` com a CLI.\n",
  );
  process.exit(1);
}
if (problemas > 0) {
  console.log(`${problemas} problema(s) encontrado(s). Veja as linhas marcadas com ✗ acima.\n`);
  process.exit(1);
}
console.log("Conexão, schema e isolamento anônimo conferidos.\n");
