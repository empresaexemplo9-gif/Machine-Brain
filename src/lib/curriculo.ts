/**
 * Grade curricular de referência do curso de Direito.
 *
 * Cada faculdade monta a grade do seu jeito, então isto é um PONTO DE PARTIDA,
 * não uma verdade: o aluno informa o período, a plataforma matricula nas
 * disciplinas típicas daquele período e ele ajusta o que não bate com a grade
 * da faculdade dele. É por isso que `matriculas` é uma tabela editável e não um
 * campo derivado do período.
 *
 * `areas` é o elo com o catálogo de fontes (src/lib/fontes): é por ela que o
 * Professor IA busca legislação pertinente à disciplina em que a pergunta foi
 * feita. `temas` alimenta o gerador de questões e o plano de estudos.
 */

export interface Disciplina {
  slug: string;
  nome: string;
  periodo: number;
  emoji: string;
  ementa: string;
  /** Áreas usadas para recuperar fontes do catálogo jurídico. */
  areas: string[];
  /** Tópicos da disciplina, usados em questões e no plano de estudos. */
  temas: string[];
}

export const DISCIPLINAS: Disciplina[] = [
  // ------------------------------- 1º período -------------------------------
  {
    slug: "introducao-ao-estudo-do-direito",
    nome: "Introdução ao Estudo do Direito",
    periodo: 1,
    emoji: "🧭",
    ementa: "Conceito de direito, fontes, norma jurídica, vigência e aplicação da lei no tempo e no espaço.",
    areas: ["introdução ao estudo do direito"],
    temas: [
      "Conceito e acepções de Direito",
      "Fontes do Direito",
      "Norma jurídica: estrutura e classificação",
      "Vigência, eficácia e revogação (LINDB)",
      "Direito objetivo e direito subjetivo",
      "Ramos do Direito: público e privado",
    ],
  },
  {
    slug: "teoria-geral-do-estado",
    nome: "Teoria Geral do Estado",
    periodo: 1,
    emoji: "🏛️",
    ementa: "Formação do Estado, elementos constitutivos, soberania, formas de Estado e de governo.",
    areas: ["teoria geral do estado", "direito constitucional"],
    temas: [
      "Elementos do Estado: povo, território e soberania",
      "Formas de Estado: unitário e federado",
      "Formas e sistemas de governo",
      "Separação dos Poderes",
      "Contratualistas: Hobbes, Locke e Rousseau",
    ],
  },
  {
    slug: "filosofia-do-direito",
    nome: "Filosofia do Direito",
    periodo: 1,
    emoji: "💭",
    ementa: "Jusnaturalismo, positivismo jurídico, pós-positivismo, justiça e legitimidade do direito.",
    areas: ["filosofia do direito", "introdução ao estudo do direito"],
    temas: [
      "Direito natural e jusnaturalismo",
      "Positivismo jurídico: Kelsen e Hart",
      "Pós-positivismo e princípios",
      "Justiça em Aristóteles e em Rawls",
      "Relação entre direito e moral",
    ],
  },
  {
    slug: "ciencia-politica",
    nome: "Ciência Política",
    periodo: 1,
    emoji: "🗳️",
    ementa: "Poder político, regimes, democracia, representação e sistemas eleitorais.",
    areas: ["ciência política", "teoria geral do estado"],
    temas: [
      "Poder político e legitimidade",
      "Democracia representativa e participativa",
      "Sistemas eleitorais e partidários",
      "Funções do Poder Legislativo",
      "Opinião pública e sociedade civil",
    ],
  },
  {
    slug: "sociologia-juridica",
    nome: "Sociologia Jurídica",
    periodo: 1,
    emoji: "👥",
    ementa: "Direito como fenômeno social, controle social, acesso à justiça e pluralismo jurídico.",
    areas: ["sociologia jurídica"],
    temas: [
      "Direito e controle social",
      "Durkheim, Weber e Marx sobre o direito",
      "Acesso à justiça",
      "Pluralismo jurídico",
      "Efetividade das normas",
    ],
  },
  {
    slug: "direito-civil-parte-geral",
    nome: "Direito Civil I — Parte Geral",
    periodo: 1,
    emoji: "📘",
    ementa: "Pessoas naturais e jurídicas, bens, fatos e negócios jurídicos, prescrição e decadência.",
    areas: ["direito civil"],
    temas: [
      "Personalidade e capacidade civil",
      "Direitos da personalidade",
      "Pessoa jurídica e desconsideração",
      "Negócio jurídico: existência, validade e eficácia",
      "Defeitos do negócio jurídico",
      "Prescrição e decadência",
    ],
  },

  // ------------------------------- 2º período -------------------------------
  {
    slug: "direito-constitucional-i",
    nome: "Direito Constitucional I",
    periodo: 2,
    emoji: "⚖️",
    ementa: "Teoria da constituição, poder constituinte, princípios fundamentais e direitos fundamentais.",
    areas: ["direito constitucional"],
    temas: [
      "Poder constituinte originário e derivado",
      "Classificação das constituições",
      "Princípios fundamentais (arts. 1º a 4º)",
      "Direitos e garantias fundamentais",
      "Remédios constitucionais",
      "Aplicabilidade das normas constitucionais",
    ],
  },
  {
    slug: "direitos-humanos",
    nome: "Direitos Humanos",
    periodo: 2,
    emoji: "🕊️",
    ementa: "Gerações de direitos, sistema internacional de proteção e incorporação dos tratados.",
    areas: ["direitos humanos", "direito constitucional"],
    temas: [
      "Direitos do homem, direitos humanos e direitos fundamentais",
      "Gerações ou dimensões de direitos",
      "Declaração Universal de 1948",
      "Sistema interamericano e Pacto de San José",
      "Status dos tratados de direitos humanos no Brasil",
      "Dignidade da pessoa humana",
    ],
  },
  {
    slug: "direito-civil-obrigacoes",
    nome: "Direito Civil II — Obrigações",
    periodo: 2,
    emoji: "🤝",
    ementa: "Obrigações, modalidades, transmissão, adimplemento, inadimplemento e mora.",
    areas: ["direito civil"],
    temas: [
      "Elementos e classificação das obrigações",
      "Obrigações de dar, fazer e não fazer",
      "Adimplemento e extinção",
      "Mora e inadimplemento",
      "Perdas e danos, juros e cláusula penal",
    ],
  },
  {
    slug: "direito-penal-parte-geral",
    nome: "Direito Penal I — Parte Geral",
    periodo: 2,
    emoji: "🔒",
    ementa: "Princípios penais, teoria do crime, tipicidade, ilicitude e culpabilidade.",
    areas: ["direito penal"],
    temas: [
      "Princípio da legalidade e anterioridade",
      "Lei penal no tempo e no espaço",
      "Teoria do crime: fato típico, ilicitude e culpabilidade",
      "Dolo e culpa",
      "Excludentes de ilicitude",
      "Concurso de pessoas",
    ],
  },
  {
    slug: "hermeneutica-juridica",
    nome: "Hermenêutica Jurídica",
    periodo: 2,
    emoji: "🔍",
    ementa: "Interpretação e integração das normas, antinomias e argumentação jurídica.",
    areas: ["hermenêutica jurídica", "introdução ao estudo do direito"],
    temas: [
      "Métodos de interpretação",
      "Analogia, costumes e princípios gerais",
      "Antinomias e critérios de solução",
      "Argumentação jurídica",
      "Interpretação conforme a Constituição",
    ],
  },

  // ------------------------------- 3º período -------------------------------
  {
    slug: "direito-constitucional-ii",
    nome: "Direito Constitucional II",
    periodo: 3,
    emoji: "🏛️",
    ementa: "Organização do Estado e dos Poderes, processo legislativo e controle de constitucionalidade.",
    areas: ["direito constitucional"],
    temas: [
      "Organização do Estado e federalismo",
      "Poder Legislativo e processo legislativo",
      "Poder Executivo e Poder Judiciário",
      "Controle de constitucionalidade difuso e concentrado",
      "ADI, ADC, ADPF e ADO",
    ],
  },
  {
    slug: "direito-administrativo-i",
    nome: "Direito Administrativo I",
    periodo: 3,
    emoji: "🏢",
    ementa: "Regime jurídico administrativo, princípios, poderes, atos administrativos e organização.",
    areas: ["direito administrativo"],
    temas: [
      "Princípios da Administração Pública",
      "Poderes administrativos",
      "Atos administrativos: elementos e atributos",
      "Administração direta e indireta",
      "Agentes públicos",
    ],
  },
  {
    slug: "direito-civil-contratos",
    nome: "Direito Civil III — Contratos",
    periodo: 3,
    emoji: "📄",
    ementa: "Teoria geral dos contratos, função social, boa-fé objetiva e contratos em espécie.",
    areas: ["direito civil"],
    temas: [
      "Princípios contratuais e função social",
      "Boa-fé objetiva e deveres anexos",
      "Formação e extinção dos contratos",
      "Vícios redibitórios e evicção",
      "Compra e venda, locação e prestação de serviços",
    ],
  },
  {
    slug: "direito-penal-parte-especial",
    nome: "Direito Penal II — Parte Especial",
    periodo: 3,
    emoji: "🔒",
    ementa: "Crimes contra a pessoa, contra o patrimônio e contra a administração pública.",
    areas: ["direito penal"],
    temas: [
      "Crimes contra a vida",
      "Lesão corporal",
      "Furto, roubo e estelionato",
      "Crimes contra a honra",
      "Crimes contra a administração pública",
    ],
  },

  // ------------------------------- 4º período -------------------------------
  {
    slug: "teoria-geral-do-processo",
    nome: "Teoria Geral do Processo",
    periodo: 4,
    emoji: "📚",
    ementa: "Jurisdição, ação, processo, princípios processuais e competência.",
    areas: ["direito processual civil"],
    temas: [
      "Jurisdição e seus princípios",
      "Ação e condições da ação",
      "Processo e procedimento",
      "Princípios do contraditório e da ampla defesa",
      "Competência",
    ],
  },
  {
    slug: "direito-administrativo-ii",
    nome: "Direito Administrativo II",
    periodo: 4,
    emoji: "🏢",
    ementa: "Licitações e contratos, serviços públicos, bens públicos, improbidade e controle.",
    areas: ["direito administrativo"],
    temas: [
      "Licitações e contratos administrativos",
      "Serviços públicos e concessões",
      "Bens públicos",
      "Responsabilidade civil do Estado",
      "Improbidade administrativa",
    ],
  },
  {
    slug: "direito-civil-reais",
    nome: "Direito Civil IV — Direitos Reais",
    periodo: 4,
    emoji: "🏠",
    ementa: "Posse, propriedade, direitos reais sobre coisa alheia e direitos reais de garantia.",
    areas: ["direito civil"],
    temas: [
      "Posse: teorias, classificação e proteção",
      "Propriedade e função social",
      "Aquisição e perda da propriedade",
      "Usucapião",
      "Direitos reais de garantia",
    ],
  },
  {
    slug: "direito-empresarial-i",
    nome: "Direito Empresarial I",
    periodo: 4,
    emoji: "🏭",
    ementa: "Empresário, estabelecimento, nome empresarial, sociedades e títulos de crédito.",
    areas: ["direito empresarial"],
    temas: [
      "Empresário e atividade empresarial",
      "Estabelecimento empresarial",
      "Tipos societários",
      "Sociedade limitada e sociedade anônima",
      "Títulos de crédito",
    ],
  },

  // ------------------------------- 5º período -------------------------------
  {
    slug: "processo-civil-conhecimento",
    nome: "Processo Civil I — Processo de Conhecimento",
    periodo: 5,
    emoji: "⚙️",
    ementa: "Petição inicial, resposta do réu, provas, sentença e coisa julgada.",
    areas: ["direito processual civil", "prática jurídica"],
    temas: [
      "Requisitos da petição inicial",
      "Tutelas provisórias",
      "Contestação e reconvenção",
      "Teoria geral das provas",
      "Sentença e coisa julgada",
    ],
  },
  {
    slug: "processo-penal-i",
    nome: "Processo Penal I",
    periodo: 5,
    emoji: "🔎",
    ementa: "Inquérito policial, ação penal, provas, prisões e medidas cautelares.",
    areas: ["direito processual penal"],
    temas: [
      "Inquérito policial e valor probatório",
      "Ação penal pública e privada",
      "Provas no processo penal",
      "Prisão em flagrante, preventiva e temporária",
      "Audiência de custódia",
    ],
  },
  {
    slug: "direito-do-trabalho-i",
    nome: "Direito do Trabalho I",
    periodo: 5,
    emoji: "👷",
    ementa: "Relação de emprego, contrato de trabalho, jornada, remuneração e alteração contratual.",
    areas: ["direito do trabalho"],
    temas: [
      "Requisitos da relação de emprego",
      "Empregado e empregador",
      "Contrato de trabalho e suas modalidades",
      "Jornada de trabalho e horas extras",
      "Remuneração e salário",
    ],
  },
  {
    slug: "direito-civil-familia",
    nome: "Direito Civil V — Família",
    periodo: 5,
    emoji: "👪",
    ementa: "Casamento, união estável, regimes de bens, filiação, alimentos e guarda.",
    areas: ["direito civil"],
    temas: [
      "Casamento e união estável",
      "Regimes de bens",
      "Dissolução do vínculo conjugal",
      "Filiação e poder familiar",
      "Alimentos e guarda",
    ],
  },

  // ------------------------------- 6º período -------------------------------
  {
    slug: "processo-civil-recursos",
    nome: "Processo Civil II — Recursos e Execução",
    periodo: 6,
    emoji: "⚙️",
    ementa: "Teoria geral dos recursos, recursos em espécie, cumprimento de sentença e execução.",
    areas: ["direito processual civil", "prática jurídica"],
    temas: [
      "Pressupostos recursais",
      "Apelação e agravo de instrumento",
      "Recurso especial e extraordinário",
      "Cumprimento de sentença",
      "Execução por título extrajudicial",
    ],
  },
  {
    slug: "processo-penal-ii",
    nome: "Processo Penal II",
    periodo: 6,
    emoji: "🔎",
    ementa: "Procedimentos, tribunal do júri, nulidades e recursos criminais.",
    areas: ["direito processual penal"],
    temas: [
      "Procedimento comum ordinário e sumário",
      "Tribunal do júri",
      "Nulidades",
      "Recursos em espécie",
      "Habeas corpus e revisão criminal",
    ],
  },
  {
    slug: "direito-tributario-i",
    nome: "Direito Tributário I",
    periodo: 6,
    emoji: "💰",
    ementa: "Sistema tributário nacional, competência, limitações ao poder de tributar e tributos.",
    areas: ["direito tributário"],
    temas: [
      "Espécies tributárias",
      "Competência tributária",
      "Princípios e imunidades",
      "Obrigação e crédito tributário",
      "Lançamento e prescrição",
    ],
  },
  {
    slug: "direito-do-trabalho-ii",
    nome: "Direito do Trabalho II",
    periodo: 6,
    emoji: "👷",
    ementa: "Extinção do contrato, verbas rescisórias, estabilidade e direito coletivo.",
    areas: ["direito do trabalho"],
    temas: [
      "Modalidades de extinção contratual",
      "Verbas rescisórias e FGTS",
      "Estabilidades e garantias de emprego",
      "Sindicatos e negociação coletiva",
      "Greve",
    ],
  },

  // ------------------------------- 7º período -------------------------------
  {
    slug: "direito-do-consumidor",
    nome: "Direito do Consumidor",
    periodo: 7,
    emoji: "🛒",
    ementa: "Relação de consumo, vícios e fatos do produto e do serviço, práticas abusivas.",
    areas: ["direito do consumidor"],
    temas: [
      "Consumidor e fornecedor",
      "Vício e fato do produto e do serviço",
      "Responsabilidade objetiva no CDC",
      "Práticas e cláusulas abusivas",
      "Direito de arrependimento",
      "Inversão do ônus da prova",
    ],
  },
  {
    slug: "direito-processual-do-trabalho",
    nome: "Direito Processual do Trabalho",
    periodo: 7,
    emoji: "⚖️",
    ementa: "Justiça do Trabalho, reclamação trabalhista, audiência e recursos trabalhistas.",
    areas: ["direito do trabalho", "direito processual civil"],
    temas: [
      "Competência da Justiça do Trabalho",
      "Reclamação trabalhista",
      "Audiência una e provas",
      "Recurso ordinário e recurso de revista",
      "Execução trabalhista",
    ],
  },
  {
    slug: "direito-tributario-ii",
    nome: "Direito Tributário II",
    periodo: 7,
    emoji: "💰",
    ementa: "Impostos em espécie, processo administrativo e execução fiscal.",
    areas: ["direito tributário"],
    temas: [
      "Impostos federais, estaduais e municipais",
      "Processo administrativo fiscal",
      "Execução fiscal e embargos",
      "Ações tributárias do contribuinte",
      "Responsabilidade tributária",
    ],
  },
  {
    slug: "pratica-juridica-i",
    nome: "Prática Jurídica I",
    periodo: 7,
    emoji: "✍️",
    ementa: "Elaboração de peças, atendimento ao cliente e organização do raciocínio jurídico.",
    areas: ["prática jurídica", "direito processual civil"],
    temas: [
      "Atendimento e entrevista do cliente",
      "Estrutura da petição inicial",
      "Contestação",
      "Endereçamento e competência",
      "Pedidos e valor da causa",
    ],
  },

  // ------------------------------- 8º período -------------------------------
  {
    slug: "direito-previdenciario",
    nome: "Direito Previdenciário",
    periodo: 8,
    emoji: "🧓",
    ementa: "Seguridade social, segurados, benefícios e custeio.",
    areas: ["direito previdenciário"],
    temas: [
      "Princípios da seguridade social",
      "Segurados e dependentes",
      "Aposentadorias",
      "Auxílios e pensão por morte",
      "Custeio e contribuições",
    ],
  },
  {
    slug: "direito-ambiental",
    nome: "Direito Ambiental",
    periodo: 8,
    emoji: "🌱",
    ementa: "Princípios ambientais, licenciamento, responsabilidade e tutela coletiva.",
    areas: ["direito ambiental"],
    temas: [
      "Princípios da prevenção e precaução",
      "Licenciamento ambiental",
      "Responsabilidade civil ambiental",
      "Áreas de preservação",
      "Ação civil pública ambiental",
    ],
  },
  {
    slug: "etica-e-estatuto-da-oab",
    nome: "Ética Profissional e Estatuto da OAB",
    periodo: 8,
    emoji: "🎖️",
    ementa: "Estatuto da Advocacia, Código de Ética, prerrogativas, honorários e infrações.",
    areas: ["ética profissional", "prática jurídica"],
    temas: [
      "Prerrogativas do advogado",
      "Incompatibilidades e impedimentos",
      "Honorários advocatícios",
      "Infrações e sanções disciplinares",
      "Sigilo profissional e conflito de interesses",
    ],
  },
  {
    slug: "direito-internacional",
    nome: "Direito Internacional",
    periodo: 8,
    emoji: "🌍",
    ementa: "Fontes do direito internacional, tratados, sujeitos e direito internacional privado.",
    areas: ["direito internacional"],
    temas: [
      "Fontes e sujeitos do direito internacional",
      "Tratados: formação e incorporação",
      "Organizações internacionais",
      "Conflito de leis no espaço",
      "Homologação de sentença estrangeira",
    ],
  },

  // ------------------------------ 9º e 10º períodos -------------------------
  {
    slug: "pratica-juridica-ii",
    nome: "Prática Jurídica II",
    periodo: 9,
    emoji: "✍️",
    ementa: "Peças recursais, prática penal e trabalhista, e estratégia processual.",
    areas: ["prática jurídica", "direito processual civil", "direito processual penal"],
    temas: [
      "Apelação e contrarrazões",
      "Agravo de instrumento",
      "Peças da prática penal",
      "Reclamação trabalhista",
      "Estratégia e teses processuais",
    ],
  },
  {
    slug: "arbitragem-e-mediacao",
    nome: "Arbitragem, Mediação e Conciliação",
    periodo: 9,
    emoji: "🕊️",
    ementa: "Métodos adequados de solução de conflitos, convenção de arbitragem e sentença arbitral.",
    areas: ["direito processual civil", "prática jurídica"],
    temas: [
      "Métodos adequados de solução de conflitos",
      "Convenção de arbitragem",
      "Procedimento arbitral",
      "Mediação e conciliação",
      "Execução da sentença arbitral",
    ],
  },
  {
    slug: "direito-digital",
    nome: "Direito Digital e Proteção de Dados",
    periodo: 9,
    emoji: "💻",
    ementa: "Marco Civil da Internet, LGPD, responsabilidade de plataformas e crimes digitais.",
    areas: ["direito digital", "direito do consumidor"],
    temas: [
      "Marco Civil da Internet",
      "LGPD: bases legais e direitos do titular",
      "Responsabilidade civil na internet",
      "Crimes cibernéticos",
      "Contratos eletrônicos",
    ],
  },
  {
    slug: "tcc",
    nome: "Trabalho de Conclusão de Curso",
    periodo: 10,
    emoji: "🎓",
    ementa: "Delimitação do tema, metodologia da pesquisa jurídica e redação científica.",
    areas: ["metodologia da pesquisa jurídica"],
    temas: [
      "Escolha e delimitação do tema",
      "Problema de pesquisa e hipótese",
      "Metodologia da pesquisa jurídica",
      "Revisão bibliográfica",
      "Normas ABNT e citação de fontes",
    ],
  },
  {
    slug: "pratica-juridica-iii",
    nome: "Prática Jurídica III — Exame de Ordem",
    periodo: 10,
    emoji: "🏅",
    ementa: "Preparação para a 1ª e 2ª fases do Exame de Ordem.",
    areas: ["prática jurídica", "ética profissional"],
    temas: [
      "Estratégia para a 1ª fase",
      "Escolha da área na 2ª fase",
      "Estrutura da peça profissional",
      "Questões discursivas",
      "Gestão de tempo na prova",
    ],
  },
];

const POR_SLUG = new Map(DISCIPLINAS.map((d) => [d.slug, d]));

export function disciplinaPorSlug(slug: string): Disciplina | undefined {
  return POR_SLUG.get(slug);
}

/** Disciplinas típicas de um período. Base da matrícula automática. */
export function disciplinasDoPeriodo(periodo: number): Disciplina[] {
  return DISCIPLINAS.filter((d) => d.periodo === periodo);
}

export const PERIODOS = Array.from(
  new Set(DISCIPLINAS.map((d) => d.periodo)),
).sort((a, b) => a - b);

export const NIVEIS_EXPLICACAO = [
  {
    id: "leigo",
    rotulo: "Leigo",
    emoji: "🟢",
    descricao: "Sem jargão. Linguagem do dia a dia e analogias.",
  },
  {
    id: "estudante",
    rotulo: "Estudante",
    emoji: "🟡",
    descricao: "Termos técnicos explicados, com a lógica por trás do instituto.",
  },
  {
    id: "advogado",
    rotulo: "Advogado",
    emoji: "🔵",
    descricao: "Direto ao ponto, com foco em aplicação prática e prazos.",
  },
  {
    id: "especialista",
    rotulo: "Especialista",
    emoji: "🔴",
    descricao: "Divergências doutrinárias, controvérsias e nuances técnicas.",
  },
] as const;

export type NivelExplicacao = (typeof NIVEIS_EXPLICACAO)[number]["id"];

export function ehNivelValido(valor: string): valor is NivelExplicacao {
  return NIVEIS_EXPLICACAO.some((n) => n.id === valor);
}
