/**
 * Contrato das fontes juridicas da plataforma.
 *
 * Regra de ouro do projeto: a IA nao e a fonte. A IA interpreta uma fonte que
 * existe, tem endereco e tem data de verificacao. Todo dispositivo exibido ao
 * usuario precisa ser representavel por este tipo -- se nao cabe aqui, nao vai
 * para a tela.
 */

export type TipoFonte = "legislacao" | "sumula" | "doutrina" | "artigo" | "dado";

/**
 * Localizador que permite a QUALQUER pessoa achar a obra e conferir.
 *
 * Doutrina e dados entram no catálogo só com um destes. A razão é prática: um
 * artigo de lei inventado o aluno descobre em trinta segundos no Planalto; um
 * livro inventado, com autor plausível e página plausível, ele provavelmente
 * nunca vai conferir. Quanto mais difícil de checar, mais rígido o requisito.
 *
 * ISBN e DOI têm dígito verificador ou formato fixo, então um valor inventado
 * é rejeitado mecanicamente por scripts/verificar-catalogo.ts — não depende de
 * alguém reparar.
 */
export interface Localizador {
  tipo: "isbn" | "doi" | "url";
  valor: string;
}

export interface Fonte {
  /** Identificador estavel usado nas citacoes da IA. Ex.: "cf88-art5-lxviii". */
  id: string;
  tipo: TipoFonte;
  /** Nome por extenso da norma. Ex.: "Constituicao Federal de 1988". */
  norma: string;
  /** Forma curta usada na citacao. Ex.: "CF/88". */
  siglaNorma: string;
  /** Dispositivo especifico. Ex.: "Art. 5o, LXVIII" ou "Sumula Vinculante 11". */
  dispositivo: string;
  /** Rotulo curto do conteudo, para listagens. */
  ementa: string;
  /** Texto literal do dispositivo, transcrito da fonte oficial. */
  texto: string;
  /** Areas do Direito as quais o dispositivo pertence (usadas na busca). */
  areas: string[];
  /** Termos adicionais de indexacao que nao aparecem no texto literal. */
  sinonimos?: string[];
  /** Endereco publico e oficial de onde o texto foi transcrito. */
  url: string;
  /** Orgao responsavel pela publicacao consultada. */
  origem: string;
  /** Data (ISO) em que o texto foi conferido contra a fonte oficial. */
  verificadoEm: string;

  /**
   * Quem assina. Obrigatório em doutrina, artigo e dado — uma tese sem autor
   * não é citável, é boato.
   */
  autoria?: string;
  /** Edição e ano da obra impressa. Ex.: "12. ed., 2024". */
  edicao?: string;
  /** Obrigatório em doutrina, artigo e dado. Ver Localizador. */
  localizador?: Localizador;
}

/** Os tipos cuja citação exige autoria e localizador verificável. */
export const TIPOS_COM_AUTORIA: readonly TipoFonte[] = ["doutrina", "artigo", "dado"];

/** Fonte recuperada por uma busca, com a pontuacao que a trouxe. */
export interface FonteRecuperada extends Fonte {
  pontuacao: number;
}

/**
 * Resultado da auditoria de uma resposta da IA.
 *
 * `citacoesValidas` sao marcadores que apontam para fontes realmente enviadas
 * ao modelo. `citacoesInvalidas` e `mencoesSemFonte` sao o que a interface
 * precisa destacar como NAO verificado.
 */
export interface AuditoriaDeCitacoes {
  citacoesValidas: Fonte[];
  /** IDs citados pelo modelo que nao existem no catalogo enviado a ele. */
  citacoesInvalidas: string[];
  /** Referencias em texto livre ("Art. 42 do CPC") sem marcador de fonte. */
  mencoesSemFonte: string[];
  /** true quando nada ficou pendente de verificacao. */
  integra: boolean;
}
