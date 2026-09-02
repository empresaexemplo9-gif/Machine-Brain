import type { Fonte } from "./tipos";

const CONFERIDO = "2026-09-02";

/**
 * Seed de súmulas do STF e do STJ.
 *
 * Por que só súmulas no V1, e não acórdãos: uma súmula é um enunciado numerado,
 * estável e conferível na página oficial do tribunal. Um acórdão exige número
 * de processo, órgão julgador, relator e data — e é exatamente aí que uma IA
 * sem base indexada começa a inventar. O `pesquisador` (src/lib/juris) trata
 * jurisprudência de acórdãos como uma fonte AINDA NÃO CONECTADA e diz isso ao
 * usuário, em vez de preencher o vazio com precedente fabricado.
 */
export const SUMULAS: Fonte[] = [
  {
    id: "sv-11-stf",
    tipo: "sumula",
    norma: "Supremo Tribunal Federal",
    siglaNorma: "STF",
    dispositivo: "Súmula Vinculante 11",
    ementa: "Uso de algemas",
    texto:
      "Só é lícito o uso de algemas em casos de resistência e de fundado receio de fuga ou de perigo à integridade física própria ou alheia, por parte do preso ou de terceiros, justificada a excepcionalidade por escrito, sob pena de responsabilidade disciplinar, civil e penal do agente ou da autoridade e de nulidade da prisão ou do ato processual a que se refere, sem prejuízo da responsabilidade civil do Estado.",
    areas: ["direito processual penal", "direitos humanos", "direito constitucional"],
    sinonimos: ["algemas", "dignidade do preso"],
    url: "https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp?base=26",
    origem: "Supremo Tribunal Federal — súmulas vinculantes",
    verificadoEm: CONFERIDO,
  },
  {
    id: "sv-14-stf",
    tipo: "sumula",
    norma: "Supremo Tribunal Federal",
    siglaNorma: "STF",
    dispositivo: "Súmula Vinculante 14",
    ementa: "Acesso do defensor aos elementos de prova já documentados",
    texto:
      "É direito do defensor, no interesse do representado, ter acesso amplo aos elementos de prova que, já documentados em procedimento investigatório realizado por órgão com competência de polícia judiciária, digam respeito ao exercício do direito de defesa.",
    areas: ["direito processual penal", "direito constitucional"],
    sinonimos: ["acesso aos autos", "prerrogativa do advogado", "inquérito policial"],
    url: "https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp?base=26",
    origem: "Supremo Tribunal Federal — súmulas vinculantes",
    verificadoEm: CONFERIDO,
  },
  {
    id: "sv-25-stf",
    tipo: "sumula",
    norma: "Supremo Tribunal Federal",
    siglaNorma: "STF",
    dispositivo: "Súmula Vinculante 25",
    ementa: "Prisão civil do depositário infiel",
    texto:
      "É ilícita a prisão civil de depositário infiel, qualquer que seja a modalidade do depósito.",
    areas: ["direito constitucional", "direitos humanos", "direito civil"],
    sinonimos: ["depositário infiel", "prisão civil", "pacto de são josé da costa rica"],
    url: "https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp?base=26",
    origem: "Supremo Tribunal Federal — súmulas vinculantes",
    verificadoEm: CONFERIDO,
  },
  {
    id: "sumula-279-stf",
    tipo: "sumula",
    norma: "Supremo Tribunal Federal",
    siglaNorma: "STF",
    dispositivo: "Súmula 279",
    ementa: "Reexame de prova em recurso extraordinário",
    texto: "Para simples reexame de prova não cabe recurso extraordinário.",
    areas: ["direito processual civil", "direito constitucional"],
    sinonimos: ["recurso extraordinário", "reexame de prova"],
    url: "https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp",
    origem: "Supremo Tribunal Federal — súmulas",
    verificadoEm: CONFERIDO,
  },
  {
    id: "sumula-7-stj",
    tipo: "sumula",
    norma: "Superior Tribunal de Justiça",
    siglaNorma: "STJ",
    dispositivo: "Súmula 7",
    ementa: "Reexame de prova em recurso especial",
    texto: "A pretensão de simples reexame de prova não enseja recurso especial.",
    areas: ["direito processual civil"],
    sinonimos: ["recurso especial", "reexame de prova", "óbice sumular"],
    url: "https://www.stj.jus.br/sites/portalp/Jurisprudencia/Sumulas",
    origem: "Superior Tribunal de Justiça — súmulas",
    verificadoEm: CONFERIDO,
  },
  {
    id: "sumula-297-stj",
    tipo: "sumula",
    norma: "Superior Tribunal de Justiça",
    siglaNorma: "STJ",
    dispositivo: "Súmula 297",
    ementa: "CDC aplicado a instituições financeiras",
    texto: "O Código de Defesa do Consumidor é aplicável às instituições financeiras.",
    areas: ["direito do consumidor", "direito civil"],
    sinonimos: ["banco", "instituição financeira", "relação de consumo bancária"],
    url: "https://www.stj.jus.br/sites/portalp/Jurisprudencia/Sumulas",
    origem: "Superior Tribunal de Justiça — súmulas",
    verificadoEm: CONFERIDO,
  },
  {
    id: "sumula-385-stj",
    tipo: "sumula",
    norma: "Superior Tribunal de Justiça",
    siglaNorma: "STJ",
    dispositivo: "Súmula 385",
    ementa: "Dano moral e inscrição preexistente em cadastro de inadimplentes",
    texto:
      "Da anotação irregular em cadastro de proteção ao crédito, não cabe indenização por dano moral, quando preexistente legítima inscrição, ressalvado o direito ao cancelamento.",
    areas: ["direito do consumidor", "direito civil"],
    sinonimos: ["negativação indevida", "serasa", "spc", "dano moral"],
    url: "https://www.stj.jus.br/sites/portalp/Jurisprudencia/Sumulas",
    origem: "Superior Tribunal de Justiça — súmulas",
    verificadoEm: CONFERIDO,
  },
  {
    id: "sumula-543-stj",
    tipo: "sumula",
    norma: "Superior Tribunal de Justiça",
    siglaNorma: "STJ",
    dispositivo: "Súmula 543",
    ementa: "Restituição de parcelas na resolução de promessa de compra e venda de imóvel",
    texto:
      "Na hipótese de resolução de contrato de promessa de compra e venda de imóvel submetido ao Código de Defesa do Consumidor, deve ocorrer a imediata restituição das parcelas pagas pelo promitente comprador — integralmente, em caso de culpa exclusiva do promitente vendedor/construtor, ou parcialmente, caso tenha sido o comprador quem deu causa ao desfazimento.",
    areas: ["direito do consumidor", "direito civil"],
    sinonimos: ["distrato", "promessa de compra e venda", "restituição de parcelas"],
    url: "https://www.stj.jus.br/sites/portalp/Jurisprudencia/Sumulas",
    origem: "Superior Tribunal de Justiça — súmulas",
    verificadoEm: CONFERIDO,
  },
];
