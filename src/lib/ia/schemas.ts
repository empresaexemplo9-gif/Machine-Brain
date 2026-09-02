import { z } from "zod";

/**
 * Formatos que a IA é obrigada a devolver nas tarefas estruturadas.
 *
 * Cada schema carrega um campo `fontes` com IDs do catálogo. Ele existe para
 * que a auditoria de citações funcione também fora do chat: uma questão ou uma
 * análise que aponta para um ID inexistente é detectada antes de chegar à tela.
 */

export const QuestaoSchema = z.object({
  enunciado: z.string().min(10).describe("Enunciado da questão. No estilo OAB, inclui um caso concreto curto."),
  alternativas: z
    .array(z.string().min(1))
    .length(4)
    .describe("Exatamente quatro alternativas, na ordem A, B, C, D."),
  correta: z.number().int().min(0).max(3).describe("Índice da alternativa correta (0 = A)."),
  explicacao: z
    .string()
    .min(20)
    .describe("Por que a correta está certa e por que a errada mais tentadora está errada."),
  topico: z.string().min(2).describe("Tópico da disciplina cobrado pela questão."),
  fontes: z.array(z.string()).describe("IDs de fontes do bloco <fontes> que sustentam a questão. Vazio se nenhuma se aplica."),
});
export type Questao = z.infer<typeof QuestaoSchema>;

export const SimuladoGeradoSchema = z.object({
  questoes: z.array(QuestaoSchema).min(1).max(30),
});
export type SimuladoGerado = z.infer<typeof SimuladoGeradoSchema>;

export const AnaliseDeDocumentoSchema = z.object({
  tipoDocumento: z.string().describe("Ex.: petição inicial, contestação, sentença, contrato, notificação."),
  resumo: z.string().min(20).describe("O que está acontecendo neste caso, em linguagem direta."),
  partes: z
    .array(z.object({ papel: z.string(), nome: z.string() }))
    .describe("Partes identificadas. Papel: autor, réu, contratante, etc."),
  objeto: z.string().describe("Sobre o que é a disputa ou o negócio."),
  faseProcessual: z.string().describe("Fase em que o processo está, ou 'não consta no documento'."),
  pedidos: z.array(z.string()).describe("Pedidos formulados, um por item."),
  documentosCitados: z.array(z.string()).describe("Documentos mencionados no texto."),
  pontosDeAtencao: z
    .array(
      z.object({
        titulo: z.string(),
        detalhe: z.string(),
        gravidade: z.enum(["baixa", "media", "alta"]),
      }),
    )
    .describe("Contradições, lacunas, riscos e questões de prazo ou competência."),
  proximosPassos: z.array(z.string()).describe("Ações concretas sugeridas ao advogado."),
  fontes: z.array(z.string()).describe("IDs de fontes do bloco <fontes> aplicáveis ao caso."),
});
export type AnaliseDeDocumento = z.infer<typeof AnaliseDeDocumentoSchema>;

export const RoteiroSchema = z.object({
  areaJuridica: z.string().describe("Área do Direito em que o caso se enquadra."),
  sintese: z.string().min(20).describe("O que o caso é, em duas ou três frases."),
  etapas: z
    .array(
      z.object({
        numero: z.number().int().min(1).max(8),
        titulo: z.string(),
        oQueFazer: z.string().min(20),
        perguntasChave: z.array(z.string()).min(1),
        erroComum: z.string(),
        fontes: z.array(z.string()),
      }),
    )
    .length(8)
    .describe("As oito etapas do método, na ordem."),
});
export type Roteiro = z.infer<typeof RoteiroSchema>;

export const PlanoDeEstudosSchema = z.object({
  diagnostico: z.string().min(20).describe("Leitura honesta de onde o aluno está."),
  focoPrincipal: z.string().describe("A disciplina ou tema que merece mais esforço agora."),
  blocos: z
    .array(
      z.object({
        disciplina: z.string(),
        prioridade: z.enum(["alta", "media", "baixa"]),
        oQueEstudar: z.array(z.string()).min(1),
        porQueAgora: z.string(),
        acao: z.string().describe("Ação verificável. Ex.: 'responder 15 questões de controle de constitucionalidade'."),
        tempoEstimado: z.string().describe("Ex.: '2h por semana'."),
      }),
    )
    .min(2)
    .max(8),
  metaDaSemana: z.string().describe("Uma meta única e checável para os próximos sete dias."),
});
export type PlanoDeEstudos = z.infer<typeof PlanoDeEstudosSchema>;
