/**
 * Guarda de integridade do catálogo jurídico.
 *
 * Roda com `npm run verificar:catalogo`. Falha (exit 1) se alguma fonte entrar
 * no acervo sem o que a torna rastreável: id único, texto literal, endereço
 * oficial e data de conferência. É a checagem que impede o catálogo de
 * degradar em "quase uma fonte" ao longo do tempo.
 */
import { CATALOGO, buscarFontes } from "../src/lib/fontes/index";

const problemas: string[] = [];
const vistos = new Set<string>();

for (const f of CATALOGO) {
  const onde = `${f.siglaNorma} ${f.dispositivo}`;

  if (!/^[a-z0-9-]+$/.test(f.id)) problemas.push(`${onde}: id fora do padrão (${f.id})`);
  if (vistos.has(f.id)) problemas.push(`${onde}: id duplicado (${f.id})`);
  vistos.add(f.id);

  if (f.texto.trim().length < 20) problemas.push(`${onde}: texto literal ausente ou curto demais`);
  if (!f.url.startsWith("https://")) problemas.push(`${onde}: URL oficial ausente ou não-HTTPS`);
  if (!f.origem.trim()) problemas.push(`${onde}: origem não informada`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.verificadoEm)) problemas.push(`${onde}: verificadoEm inválido`);
  if (f.areas.length === 0) problemas.push(`${onde}: nenhuma área do Direito atribuída`);
  if (!f.ementa.trim()) problemas.push(`${onde}: ementa vazia`);
}

// O catálogo só serve se for alcançável pela busca: uma fonte que nenhuma
// consulta pelo próprio assunto encontra é uma fonte morta.
for (const f of CATALOGO) {
  const encontrou = buscarFontes(f.ementa, { limite: 8 }).some((r) => r.id === f.id);
  if (!encontrou) problemas.push(`${f.siglaNorma} ${f.dispositivo}: inalcançável pela busca da própria ementa`);
}

if (problemas.length > 0) {
  console.error(`\n${problemas.length} problema(s) no catálogo:\n`);
  for (const p of problemas) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(`Catálogo íntegro: ${CATALOGO.length} fontes, todas rastreáveis e alcançáveis.`);
