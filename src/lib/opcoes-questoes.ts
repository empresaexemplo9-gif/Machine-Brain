/**
 * Opções do gerador de questões.
 *
 * Vive fora de `src/lib/servicos/questoes.ts` porque o formulário é um
 * componente de cliente: importar estas constantes do serviço arrastaria o
 * banco e o SDK do modelo para o bundle do navegador.
 */

export const ESTILOS = [
  { id: "faculdade", rotulo: "Prova da faculdade" },
  { id: "oab", rotulo: "Estilo OAB" },
  { id: "concurso", rotulo: "Estilo concurso" },
] as const;

export const DIFICULDADES = [
  { id: "facil", rotulo: "Fácil" },
  { id: "media", rotulo: "Média" },
  { id: "dificil", rotulo: "Difícil" },
] as const;

export type EstiloQuestao = (typeof ESTILOS)[number]["id"];
export type DificuldadeQuestao = (typeof DIFICULDADES)[number]["id"];
