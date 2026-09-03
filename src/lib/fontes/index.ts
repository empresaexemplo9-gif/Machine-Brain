import { LEGISLACAO } from "./catalogo-legislacao";
import { SUMULAS } from "./catalogo-sumulas";
import type { AuditoriaDeCitacoes, Fonte, FonteRecuperada } from "./tipos";

export * from "./tipos";
export { LEGISLACAO } from "./catalogo-legislacao";
export { SUMULAS } from "./catalogo-sumulas";

/** Catálogo completo indexado por id. */
export const CATALOGO: Fonte[] = [...LEGISLACAO, ...SUMULAS];

const POR_ID = new Map(CATALOGO.map((f) => [f.id, f]));

export function buscarFontePorId(id: string): Fonte | undefined {
  return POR_ID.get(id);
}

// ---------------------------------------------------------------------------
// Busca
// ---------------------------------------------------------------------------

/**
 * Palavras que aparecem em quase toda pergunta jurídica e por isso não
 * discriminam nada. Mantidas fora do índice para o ranking não degenerar.
 */
const VAZIAS = new Set([
  "a", "à", "as", "ao", "aos", "o", "os", "um", "uma", "uns", "umas",
  "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas",
  "por", "para", "pra", "pelo", "pela", "com", "sem", "sob", "sobre",
  "e", "ou", "que", "se", "como", "quando", "onde", "qual", "quais",
  "é", "sao", "ser", "foi", "era", "seu", "sua", "seus", "suas",
  "me", "meu", "minha", "eu", "voce", "professor", "explica", "explicar",
  "entendi", "duvida", "pergunta", "direito", "lei", "artigo", "sobre",
  "isso", "esse", "essa", "este", "esta", "aquele", "aquela", "nao", "sim",
]);

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokenizar(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9º°]+/)
    .filter((t) => t.length > 2 && !VAZIAS.has(t));
}

/** Índice invertido montado uma única vez por processo. */
const INDICE: Array<{ fonte: Fonte; termos: Map<string, number>; tamanho: number }> =
  CATALOGO.map((fonte) => {
    const campos = [
      // Peso maior para dispositivo/ementa/áreas: são o "título" da fonte.
      fonte.dispositivo.repeat(3),
      fonte.siglaNorma.repeat(3),
      fonte.ementa.repeat(3),
      fonte.areas.join(" ").repeat(2),
      (fonte.sinonimos ?? []).join(" ").repeat(3),
      fonte.norma,
      fonte.texto,
    ].join(" ");

    const termos = new Map<string, number>();
    const tokens = tokenizar(campos);
    for (const t of tokens) termos.set(t, (termos.get(t) ?? 0) + 1);
    return { fonte, termos, tamanho: tokens.length };
  });

/** Frequência documental de cada termo, para o fator IDF. */
const DOCS_POR_TERMO = new Map<string, number>();
for (const doc of INDICE) {
  for (const termo of doc.termos.keys()) {
    DOCS_POR_TERMO.set(termo, (DOCS_POR_TERMO.get(termo) ?? 0) + 1);
  }
}
const TAMANHO_MEDIO =
  INDICE.reduce((soma, d) => soma + d.tamanho, 0) / Math.max(INDICE.length, 1);

export interface OpcoesBusca {
  /** Quantas fontes retornar. Padrão 6. */
  limite?: number;
  /** Restringe a busca a estas áreas do Direito. */
  areas?: string[];
  /** Restringe a busca a um tipo de fonte. */
  tipo?: Fonte["tipo"];
}

/**
 * Busca lexical (BM25) sobre o catálogo curado.
 *
 * É proposital que seja simples: no V1 o catálogo tem dezenas de dispositivos e
 * BM25 resolve bem. A troca por busca vetorial está prevista para quando a
 * ingestão automatizada entrar (ver docs/FUNDAMENTACAO.md) — a assinatura desta
 * função foi desenhada para não mudar nessa troca.
 */
export function buscarFontes(consulta: string, opcoes: OpcoesBusca = {}): FonteRecuperada[] {
  const { limite = 6, areas, tipo } = opcoes;
  const termos = tokenizar(consulta);
  if (termos.length === 0) return [];

  const areasNormalizadas = areas?.map(normalizar);
  const k1 = 1.4;
  const b = 0.72;

  const resultados: FonteRecuperada[] = [];

  for (const doc of INDICE) {
    if (tipo && doc.fonte.tipo !== tipo) continue;
    if (areasNormalizadas?.length) {
      const areasDoc = doc.fonte.areas.map(normalizar);
      const bate = areasNormalizadas.some((a) =>
        areasDoc.some((ad) => ad.includes(a) || a.includes(ad)),
      );
      if (!bate) continue;
    }

    let pontuacao = 0;
    for (const termo of termos) {
      const freq = doc.termos.get(termo);
      if (!freq) continue;
      const docsComTermo = DOCS_POR_TERMO.get(termo) ?? 0;
      const idf = Math.log(
        1 + (INDICE.length - docsComTermo + 0.5) / (docsComTermo + 0.5),
      );
      const norma = freq * (k1 + 1);
      const denominador =
        freq + k1 * (1 - b + (b * doc.tamanho) / Math.max(TAMANHO_MEDIO, 1));
      pontuacao += idf * (norma / denominador);
    }

    if (pontuacao > 0) resultados.push({ ...doc.fonte, pontuacao });
  }

  return resultados.sort((x, y) => y.pontuacao - x.pontuacao).slice(0, limite);
}

/** Todas as fontes de uma área, para as telas de biblioteca da disciplina. */
export function fontesPorArea(area: string, limite = 20): Fonte[] {
  const alvo = normalizar(area);
  return CATALOGO.filter((f) =>
    f.areas.some((a) => {
      const an = normalizar(a);
      return an.includes(alvo) || alvo.includes(an);
    }),
  ).slice(0, limite);
}

// ---------------------------------------------------------------------------
// Auditoria de citações
// ---------------------------------------------------------------------------

/** Marcador que a IA é obrigada a usar para citar. Ex.: [[fonte:cc-art186]] */
export const PADRAO_CITACAO = /\[\[fonte:([a-z0-9-]+)\]\]/gi;

/**
 * Referências em texto livre que exigem lastro. Se uma frase contém uma delas
 * mas nenhum marcador, a resposta está afirmando um dispositivo sem mostrar a
 * fonte — é exatamente o caso que a interface precisa sinalizar.
 */
const REFERENCIAS_SOLTAS: RegExp[] = [
  // --- Dispositivos de lei ---
  /\bart(?:igo)?s?\.?\s*\d+[º°]?/gi,
  /\bs[úu]mulas?\s+(?:vinculantes?\s+)?n?[º°]?\s*\d+/gi,
  /\blei\s+n?[º°]?\s*[\d.]+\s*\/\s*\d{2,4}/gi,
  /\bdecreto[- ]lei\s+n?[º°]?\s*[\d.]+/gi,

  // --- Doutrina ---
  // Atribuir uma tese a um autor é afirmação verificável, e inventar autor é
  // mais difícil de conferir do que inventar artigo: o aluno não tem o livro
  // na mão. Casa só com verbo doutrinário explícito, para não punir a resposta
  // que apenas explica ("a doutrina" sozinho não basta).
  /\b(?:como|conforme|segundo)\s+(?:ensina|leciona|sustenta|observa|adverte|anota|defende)\b[^.;:!?]{0,70}/gi,
  /\bna\s+(?:li[çc][ãa]o|vis[ãa]o|opini[ãa]o|doutrina)\s+de\s+[^.;:!?]{0,70}/gi,
  /\b(?:a\s+)?doutrina\s+(?:majorit[áa]ria|dominante|cl[áa]ssica|moderna|p[áa]tria|tradicional)/gi,
  /\bsegundo\s+(?:o|a)\s+(?:autor|autora|professor|professora|jurista|doutrinador|doutrinadora)\b/gi,

  // --- Jurisprudência ---
  // Número de processo é o campo que um modelo fabrica com mais confiança, e o
  // que mais parece verdade. A plataforma não indexa acórdãos: qualquer número
  // que apareça está, por construção, sem lastro.
  /\b(?:RE|REsp|AREsp|HC|RHC|MS|ADI|ADPF|ADC|AgRg|AgInt|EDcl)\s*n?[º°]?\s*[\d][\d.\/-]{2,}/g,
  /\bac[óo]rd[ãa]o\s+n?[º°]?\s*[\d][\d.\/-]*/gi,
  /\b(?:julgad[oa]|decidid[oa]|decidiu|entendeu|firmou\s+(?:o\s+)?entendimento)\s+(?:pel[oa]|n[oa])\s+(?:STF|STJ|TST|TSE)\b[^.;:!?]{0,50}/gi,
  // O tribunal também aparece antes do verbo: "o STF já decidiu que…".
  /\b(?:o\s+)?(?:STF|STJ|TST|TSE)\s+(?:j[áa]\s+)?(?:decidiu|entendeu|firmou|consolidou|pacificou|assentou|reconheceu)\b[^.;:!?]{0,50}/gi,

  // --- Dados e pesquisa ---
  // Número atribuído a instituição é o mesmo problema com outra roupa.
  /\b(?:segundo|conforme|de\s+acordo\s+com)\s+(?:dados|pesquisa|levantamento|estudo|relat[óo]rio|estat[íi]sticas?)\b[^.;:!?]{0,60}/gi,
  /\b(?:segundo|conforme|de\s+acordo\s+com)\s+(?:o\s+|a\s+)?(?:CNJ|IBGE|IPEA|OAB|DataFolha|Datafolha)\b/gi,
];

export function extrairCitacoes(texto: string): string[] {
  const ids: string[] = [];
  for (const m of texto.matchAll(PADRAO_CITACAO)) ids.push(m[1].toLowerCase());
  return [...new Set(ids)];
}

/**
 * Confere uma resposta da IA contra as fontes que realmente foram enviadas a
 * ela. Duas perguntas são respondidas aqui:
 *
 *  1. O modelo citou algum id que não existe no contexto? (invenção de fonte)
 *  2. O modelo afirmou "Art. X" em algum ponto sem ancorar? (afirmação sem lastro)
 *
 * O resultado alimenta o selo de verificação exibido junto de cada resposta.
 */
export function auditarCitacoes(
  resposta: string,
  fontesEnviadas: Fonte[],
): AuditoriaDeCitacoes {
  const permitidos = new Set(fontesEnviadas.map((f) => f.id.toLowerCase()));
  const citados = extrairCitacoes(resposta);

  const citacoesValidas: Fonte[] = [];
  const citacoesInvalidas: string[] = [];
  for (const id of citados) {
    const fonte = permitidos.has(id) ? buscarFontePorId(id) : undefined;
    if (fonte) citacoesValidas.push(fonte);
    else citacoesInvalidas.push(id);
  }

  // Uma frase por vez: a referência solta só é problema se a própria frase não
  // trouxer marcador. Assim uma resposta bem ancorada não é punida por repetir
  // "o artigo 186" logo depois de já ter citado a fonte.
  const mencoesSemFonte: string[] = [];
  // O ponto final só encerra a frase quando o que vem depois começa como
  // frase nova. Sem essa checagem "Art. 42" viraria duas frases e a referência
  // ficaria órfã do próprio número — deixando de ser detectada.
  const frases = resposta.split(/\n+|(?<=[.;:!?])\s+(?=["'(\[\u00C0-\u00DDA-Z])/);
  for (const frase of frases) {
    if (/\[\[fonte:/i.test(frase)) continue;
    for (const padrao of REFERENCIAS_SOLTAS) {
      for (const m of frase.matchAll(padrao)) {
        mencoesSemFonte.push(m[0].trim());
      }
    }
  }

  return {
    citacoesValidas,
    citacoesInvalidas,
    mencoesSemFonte: [...new Set(mencoesSemFonte)],
    integra: citacoesInvalidas.length === 0 && mencoesSemFonte.length === 0,
  };
}

/**
 * Bloco de contexto injetado no prompt. O modelo só pode citar o que está aqui.
 */
export function montarContextoDeFontes(fontes: Fonte[]): string {
  if (fontes.length === 0) {
    return "NENHUMA FONTE DISPONÍVEL PARA ESTA CONSULTA.";
  }
  return fontes
    .map(
      (f) =>
        [
          `<fonte id="${f.id}">`,
          `norma: ${f.norma}`,
          `dispositivo: ${f.dispositivo}`,
          `assunto: ${f.ementa}`,
          `texto literal: ${f.texto}`,
          `origem: ${f.origem} (conferido em ${f.verificadoEm})`,
          `</fonte>`,
        ].join("\n"),
    )
    .join("\n\n");
}
