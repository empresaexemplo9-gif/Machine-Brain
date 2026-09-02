/**
 * Diagnóstico da conexão com o Supabase, no terminal.
 *
 * A bateria em si vive em src/lib/supabase/diagnostico.ts, compartilhada com a
 * página /diagnostico. Aqui só se imprime o resultado e se escolhe o código de
 * saída, para o CI poder falhar.
 *
 * A pergunta que mais importa é a última: uma consulta SEM SESSÃO tem que ser
 * recusada. Se ela devolver linhas, o banco está aberto para qualquer um com a
 * chave pública — que vai no bundle do navegador.
 *
 *   npm run verificar:conexao
 */
import { diagnosticar } from "../src/lib/supabase/diagnostico";

const SIMBOLO = { ok: "✓", aviso: "!", falha: "✗" } as const;

async function main(): Promise<void> {
  const { checagens, estado, resumo, passos } = await diagnosticar();

  console.log("");
  for (const c of checagens) {
    console.log(`  ${SIMBOLO[c.estado]} ${c.titulo}`);
    if (c.detalhe) console.log(`      ${c.detalhe}`);
  }

  console.log(`\n${resumo}`);
  if (passos.length > 0) {
    console.log("");
    passos.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
  }
  console.log("");

  process.exit(estado === "falha" ? 1 : 0);
}

void main();
