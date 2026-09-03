/**
 * Guarda de integridade do catálogo jurídico.
 *
 * Roda com `npm run verificar:catalogo`. Falha (exit 1) se alguma fonte entrar
 * no acervo sem o que a torna rastreável: id único, texto literal, endereço
 * oficial e data de conferência. É a checagem que impede o catálogo de
 * degradar em "quase uma fonte" ao longo do tempo.
 */
import { CATALOGO, auditarCitacoes, buscarFontes } from "../src/lib/fontes/index";
import { TIPOS_COM_AUTORIA } from "../src/lib/fontes/tipos";

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

// ---------------------------------------------------------------------------
// Doutrina, artigo e dado: autoria e localizador conferível
//
// Um ISBN ou DOI inventado é rejeitado aqui pelo próprio formato, sem depender
// de alguém reparar na revisão. É o que impede a fonte mais difícil de checar
// de ser justamente a menos checada.
// ---------------------------------------------------------------------------
function isbnValido(bruto: string): boolean {
  const d = bruto.replace(/[^0-9Xx]/g, "").toUpperCase();
  if (d.length === 13) {
    const soma = [...d].reduce((s, c, i) => s + Number(c) * (i % 2 === 0 ? 1 : 3), 0);
    return /^\d{13}$/.test(d) && soma % 10 === 0;
  }
  if (d.length === 10) {
    if (!/^\d{9}[\dX]$/.test(d)) return false;
    const soma = [...d].reduce((s, c, i) => s + (c === "X" ? 10 : Number(c)) * (10 - i), 0);
    return soma % 11 === 0;
  }
  return false;
}

const doiValido = (v: string) => /^10\.\d{4,9}\/\S+$/.test(v.replace(/^https?:\/\/doi\.org\//i, ""));

for (const f of CATALOGO) {
  if (!TIPOS_COM_AUTORIA.includes(f.tipo)) continue;

  if (!f.autoria?.trim()) problemas.push(`${f.id}: ${f.tipo} sem autoria`);

  const loc = f.localizador;
  if (!loc) {
    problemas.push(`${f.id}: ${f.tipo} sem localizador (ISBN, DOI ou URL oficial)`);
    continue;
  }
  if (loc.tipo === "isbn" && !isbnValido(loc.valor)) {
    problemas.push(`${f.id}: ISBN inválido (dígito verificador não fecha): ${loc.valor}`);
  }
  if (loc.tipo === "doi" && !doiValido(loc.valor)) {
    problemas.push(`${f.id}: DOI fora do formato 10.XXXX/sufixo: ${loc.valor}`);
  }
  if (loc.tipo === "url" && !/^https:\/\//.test(loc.valor)) {
    problemas.push(`${f.id}: localizador URL precisa ser https: ${loc.valor}`);
  }
}

// ---------------------------------------------------------------------------
// Auditoria: o que precisa ser sinalizado, e o que NÃO pode ser
//
// Falso negativo entrega afirmação inventada com selo de verificada — é o pior
// defeito possível aqui. Falso positivo marca resposta correta como suspeita e
// destrói a confiança no selo. As duas listas existem porque as duas falhas
// custam caro, em direções opostas.
// ---------------------------------------------------------------------------
const DEVE_SINALIZAR = [
  "Como ensina Nelson Nery Júnior, a boa-fé objetiva é cláusula geral.",
  "Na lição de Maria Helena Diniz, a posse é situação de fato.",
  "A doutrina majoritária entende que o prazo é decadencial.",
  "O STF firmou esse entendimento no RE 574.706.",
  "Isso foi decidido pelo STJ em caso análogo.",
  "O STJ pacificou a questão.",
  "Segundo dados do CNJ, 78% dos processos duram mais de cinco anos.",
  "De acordo com o IBGE, o número cresceu.",
  "O art. 186 do Código Civil trata do ato ilícito.",
];

const DEVE_FICAR_LIMPO = [
  "A boa-fé objetiva exige lealdade entre as partes.",
  "O cônjuge tem direito a 50% dos bens comuns.",
  "A doutrina discute o tema há décadas.",
  "Vamos conforme o combinado: primeiro os conceitos.",
  "Segundo o texto que você enviou, o prazo já venceu.",
  "O STF é o guardião da Constituição.",
  "Recurso extraordinário é dirigido ao STF.",
];

for (const frase of DEVE_SINALIZAR) {
  if (auditarCitacoes(frase, []).integra) {
    problemas.push(`auditoria deixou passar como verificada: "${frase}"`);
  }
}
for (const frase of DEVE_FICAR_LIMPO) {
  const auditoria = auditarCitacoes(frase, []);
  if (!auditoria.integra) {
    problemas.push(
      `auditoria marcou frase correta como suspeita: "${frase}" ` +
        `(${auditoria.mencoesSemFonte.join("; ")})`,
    );
  }
}

const porTipo = CATALOGO.reduce<Record<string, number>>((acc, f) => {
  acc[f.tipo] = (acc[f.tipo] ?? 0) + 1;
  return acc;
}, {});

console.log(
  `Catálogo íntegro: ${CATALOGO.length} fontes, todas rastreáveis e alcançáveis ` +
    `(${Object.entries(porTipo).map(([k, v]) => `${v} ${k}`).join(", ")}). ` +
    `Auditoria: ${DEVE_SINALIZAR.length} afirmações sem lastro sinalizadas, ` +
    `${DEVE_FICAR_LIMPO.length} frases corretas não marcadas.`,
);
