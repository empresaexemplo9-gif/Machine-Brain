/**
 * Verificação de ponta a ponta dos fluxos do V1.
 *
 * Percorre, num navegador real, o caminho que um usuário faz: criar conta,
 * montar a grade, navegar pelos dois ambientes, conversar com a IA, enviar
 * documento.
 *
 * Roda sem ANTHROPIC_API_KEY de propósito. É justamente aí que se verifica a
 * promessa central da plataforma: sem modelo, ela avisa que está em modo
 * demonstração e continua mostrando as fontes reais — sem inventar direito.
 *
 * ATENÇÃO: precisa de um projeto Supabase e CRIA CONTAS DE VERDADE nele.
 * Aponte para um projeto de desenvolvimento, nunca para produção. O projeto
 * também precisa estar com a confirmação de e-mail desativada, senão o cadastro
 * não devolve sessão e o percurso para no primeiro passo.
 *
 * Como as variáveis NEXT_PUBLIC_ entram no bundle na compilação, o build tem de
 * ter sido feito com elas presentes:
 *
 *   npm run build && npm run verificar:fluxos
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const PORTA = Number(process.env.MB_PORTA_TESTE ?? 3311);
const BASE = `http://127.0.0.1:${PORTA}`;

const CHAVE_PUBLICA =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !CHAVE_PUBLICA) {
  console.log(
    "\nPULADO: verificação de fluxos precisa de um projeto Supabase.\n" +
      "  Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\n" +
      "  (ou NEXT_PUBLIC_SUPABASE_ANON_KEY) apontando\n" +
      "  para um projeto de DESENVOLVIMENTO (o percurso cria contas de verdade),\n" +
      "  rode `npm run build` com elas presentes e tente de novo.\n" +
      "  O schema e as políticas de RLS continuam cobertos por `npm run verificar:rls`.\n",
  );
  process.exit(0);
}

const trabalho = mkdtempSync(join(tmpdir(), "machine-brain-e2e-"));

let falhas = 0;
async function passo(nome, fn) {
  try {
    await fn();
    console.log(`  ✓ ${nome}`);
  } catch (erro) {
    falhas += 1;
    console.log(`  ✗ ${nome}\n      ${String(erro.message).split("\n")[0]}`);
  }
}

// --------------------------------------------------------------------------
// Fixtures de PDF geradas em memória, para não versionar binários no repo.
// --------------------------------------------------------------------------
function montarPdf(linhas) {
  const conteudo = Buffer.from(
    linhas.map((l, i) => `BT /F1 12 Tf 72 ${720 - i * 20} Td (${l}) Tj ET`).join("\n"),
    "latin1",
  );
  const objetos = [
    Buffer.from("<</Type/Catalog/Pages 2 0 R>>"),
    Buffer.from("<</Type/Pages/Kids[3 0 R]/Count 1>>"),
    Buffer.from(
      "<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>",
    ),
    Buffer.concat([
      Buffer.from(`<</Length ${conteudo.length}>>stream\n`),
      conteudo,
      Buffer.from("\nendstream"),
    ]),
    Buffer.from("<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>"),
  ];

  const partes = [Buffer.from("%PDF-1.4\n")];
  const deslocamentos = [];
  let posicao = partes[0].length;
  objetos.forEach((obj, i) => {
    deslocamentos.push(posicao);
    const bloco = Buffer.concat([
      Buffer.from(`${i + 1} 0 obj\n`),
      obj,
      Buffer.from("\nendobj\n"),
    ]);
    partes.push(bloco);
    posicao += bloco.length;
  });

  const inicioXref = posicao;
  let xref = `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const d of deslocamentos) xref += `${String(d).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<</Size ${objetos.length + 1}/Root 1 0 R>>\nstartxref\n${inicioXref}\n%%EOF\n`;
  partes.push(Buffer.from(xref));

  return Buffer.concat(partes);
}

const pdfComTexto = join(trabalho, "peticao.pdf");
const pdfDigitalizado = join(trabalho, "digitalizado.pdf");
writeFileSync(
  pdfComTexto,
  montarPdf([
    "EXCELENTISSIMO SENHOR DOUTOR JUIZ DE DIREITO DA VARA CIVEL",
    "Fulano de Tal vem propor ACAO DE INDENIZACAO em face de Empresa XYZ Ltda.",
  ]),
);
// Um PDF válido cuja única página não tem texto: o mesmo que uma digitalização.
writeFileSync(pdfDigitalizado, montarPdf([]));

// --------------------------------------------------------------------------
// Servidor
// --------------------------------------------------------------------------
const servidor = spawn("npx", ["next", "start", "-p", String(PORTA)], {
  env: {
    ...process.env,
    // Sem chave: o percurso precisa provar que a plataforma avisa em vez de
    // inventar quando o modelo não está disponível.
    ANTHROPIC_API_KEY: "",
    NODE_ENV: "production",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let logDoServidor = "";
servidor.stdout.on("data", (d) => (logDoServidor += d));
servidor.stderr.on("data", (d) => (logDoServidor += d));

async function esperarServidor() {
  for (let tentativa = 0; tentativa < 90; tentativa += 1) {
    try {
      const r = await fetch(BASE, { signal: AbortSignal.timeout(1500) });
      if (r.ok) return;
    } catch {
      // ainda subindo
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`servidor não subiu na porta ${PORTA}:\n${logDoServidor}`);
}

function encerrar(codigo) {
  servidor.kill("SIGTERM");
  rmSync(trabalho, { recursive: true, force: true });
  process.exit(codigo);
}

// --------------------------------------------------------------------------
// Percurso
// --------------------------------------------------------------------------
try {
  await esperarServidor();
  console.log(`\nServidor no ar em ${BASE} (modo demonstração, sem chave de API)\n`);

  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
  const pagina = await contexto.newPage();

  const errosDeConsole = [];
  pagina.on("pageerror", (e) => errosDeConsole.push(`pageerror: ${e.message}`));
  pagina.on("console", (m) => {
    if (m.type() === "error") errosDeConsole.push(`console: ${m.text()}`);
  });

  const email = `verificacao${Date.now()}@exemplo.com`;

  await passo("o build embutiu a configuração do Supabase", async () => {
    await pagina.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
    if ((await pagina.locator('[data-teste="supabase-nao-configurado"]').count()) > 0) {
      throw new Error(
        "a aplicação subiu sem configuração do Supabase — refaça `npm run build` " +
          "com NEXT_PUBLIC_SUPABASE_URL e a chave pública definidas",
      );
    }
  });

  await passo("landing apresenta a proposta", async () => {
    await pagina.goto(BASE, { waitUntil: "networkidle" });
    await pagina
      .getByText("do primeiro período à advocacia", { exact: false })
      .first()
      .waitFor({ timeout: 5000 });
  });

  await passo("cadastro leva ao onboarding", async () => {
    await pagina.goto(`${BASE}/criar-conta`, { waitUntil: "networkidle" });
    await pagina.fill("#nome", "Arthur Verificação");
    await pagina.fill("#email", email);
    await pagina.fill("#senha", "senhaSegura123");
    await Promise.all([
      pagina.waitForURL("**/onboarding", { timeout: 20000 }),
      pagina.click('button[type="submit"]'),
    ]);
  });

  await passo("trocar de período repovoa a grade sugerida", async () => {
    await pagina.getByRole("button", { name: "2º", exact: true }).click();
    const marcadas = await pagina.locator('input[name="disciplinas"]:checked').count();
    if (marcadas < 3) throw new Error(`esperava a grade do 2º período marcada, veio ${marcadas}`);
  });

  await passo("grade salva abre o painel do estudante", async () => {
    await Promise.all([
      pagina.waitForURL("**/estudante", { timeout: 20000 }),
      pagina.locator('form button[type="submit"]:has-text("Montar")').click(),
    ]);
    await pagina.getByText("Direito Constitucional I").first().waitFor({ timeout: 5000 });
  });

  const rotas = [
    ["/estudante/disciplinas", "Sua universidade virtual"],
    ["/estudante/disciplinas/direito-constitucional-i", "Direito Constitucional I"],
    ["/estudante/professor", "Professor IA"],
    ["/estudante/questoes", "Gerador de questões"],
    ["/estudante/plano", "Plano de estudos"],
    ["/perfil", "Seu perfil"],
    ["/profissional", "Ambiente profissional"],
    ["/profissional/jurista", "Jurista IA"],
    ["/profissional/documentos", "Análise de documentos"],
    ["/profissional/roteiro", "Nunca vi esse caso"],
  ];
  for (const [rota, esperado] of rotas) {
    await passo(`rota ${rota}`, async () => {
      const resposta = await pagina.goto(BASE + rota, { waitUntil: "networkidle" });
      if (!resposta.ok()) throw new Error(`HTTP ${resposta.status()}`);
      await pagina.getByText(esperado, { exact: false }).first().waitFor({ timeout: 5000 });
    });
  }

  await passo("disciplina lista legislação verificada", async () => {
    await pagina.goto(`${BASE}/estudante/disciplinas/direito-constitucional-i`, {
      waitUntil: "networkidle",
    });
    await pagina.getByText("Art. 5º, LXVIII", { exact: false }).first().waitFor({ timeout: 5000 });
  });

  await passo("sem chave de API, o chat avisa em vez de inventar", async () => {
    await pagina.goto(`${BASE}/estudante/professor`, { waitUntil: "networkidle" });
    await pagina.fill("textarea", "O que é habeas corpus?");
    await pagina.getByRole("button", { name: "Enviar" }).click();
    await pagina
      .getByText("Modo demonstração", { exact: false })
      .last()
      .waitFor({ timeout: 30000 });
  });

  await passo("as fontes reais aparecem mesmo sem modelo", async () => {
    await pagina.getByText("Fontes consultadas", { exact: false }).first().waitFor({ timeout: 15000 });
    await pagina
      .getByText("CF/88 — Art. 5º, LXVIII", { exact: false })
      .first()
      .waitFor({ timeout: 5000 });
  });

  await passo("a conversa fica no histórico", async () => {
    await pagina.goto(`${BASE}/estudante/professor`, { waitUntil: "networkidle" });
    await pagina
      .getByText("O que é habeas corpus?", { exact: false })
      .first()
      .waitFor({ timeout: 5000 });
  });

  await passo("gerar questões sem chave devolve erro explícito", async () => {
    await pagina.goto(`${BASE}/estudante/questoes`, { waitUntil: "networkidle" });
    await pagina.locator('form:has(#disciplina) button[type="submit"]').click();
    await pagina
      .getByText("ANTHROPIC_API_KEY", { exact: false })
      .last()
      .waitFor({ timeout: 40000 });
  });

  const enviarArquivo = async (arquivo) => {
    await pagina.goto(`${BASE}/profissional/documentos`, { waitUntil: "networkidle" });
    await pagina.setInputFiles("#arquivo", arquivo);
    await pagina.locator('form:has(#arquivo) button[type="submit"]').click();
  };

  await passo("formato não suportado é recusado", async () => {
    await pagina.goto(`${BASE}/profissional/documentos`, { waitUntil: "networkidle" });
    await pagina.setInputFiles("#arquivo", {
      name: "processo.xyz",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("conteúdo irrelevante, só serve para testar a validação de formato"),
    });
    await pagina.locator('form:has(#arquivo) button[type="submit"]').click();
    await pagina.getByText("Formato não suportado", { exact: false }).waitFor({ timeout: 20000 });
  });

  await passo("PDF digitalizado é recusado com aviso de OCR", async () => {
    await enviarArquivo(pdfDigitalizado);
    await pagina
      .getByText("não tem camada de texto", { exact: false })
      .waitFor({ timeout: 25000 });
  });

  await passo("PDF com texto é extraído e aberto", async () => {
    await enviarArquivo(pdfComTexto);
    await pagina.waitForURL("**/profissional/documentos/*", { timeout: 25000 });
    await pagina
      .getByText("EXCELENTISSIMO SENHOR DOUTOR JUIZ", { exact: false })
      .first()
      .waitFor({ timeout: 5000 });
  });

  await passo("roteiro exige descrição mínima do caso", async () => {
    await pagina.goto(`${BASE}/profissional/roteiro`, { waitUntil: "networkidle" });
    await pagina.fill("#caso", "caso curto");
    await pagina.locator('form:has(#caso) button[type="submit"]').click();
    await pagina.getByText("mais de detalhe", { exact: false }).waitFor({ timeout: 20000 });
  });

  await passo("sair encerra a sessão e protege as rotas", async () => {
    await pagina.goto(`${BASE}/estudante`, { waitUntil: "networkidle" });
    await Promise.all([
      pagina.waitForURL(`${BASE}/`, { timeout: 20000 }),
      pagina.getByRole("button", { name: "Sair" }).click(),
    ]);
    await pagina.goto(`${BASE}/estudante`, { waitUntil: "networkidle" });
    if (!pagina.url().includes("/entrar")) {
      throw new Error(`esperava redirecionamento para /entrar, veio ${pagina.url()}`);
    }
  });

  await navegador.close();

  const ruido = [...new Set(errosDeConsole)].filter((e) => !/favicon/i.test(e));
  if (ruido.length > 0) {
    falhas += 1;
    console.log("\n  ✗ erros de console durante a navegação:");
    for (const e of ruido) console.log(`      ${e}`);
  } else {
    console.log("\n  ✓ nenhum erro de console durante a navegação");
  }
} catch (erro) {
  console.error("\nFalha na preparação da verificação:", erro.message);
  encerrar(1);
}

console.log(
  falhas === 0
    ? "\nTodos os fluxos passaram.\n"
    : `\n${falhas} verificação(ões) falharam.\n`,
);
encerrar(falhas === 0 ? 0 : 1);
