/**
 * Ícones do tema jurídico.
 *
 * Desenhados aqui, em vez de emoji, por três motivos práticos: emoji muda de
 * desenho conforme o sistema operacional (a balança do Windows não é a do
 * Android), não aceita a cor da marca, e destoa em peso do resto da interface.
 * Estes herdam a cor via `currentColor` e a espessura de traço é a mesma em
 * todos — é o que faz um conjunto parecer um conjunto.
 *
 * Grade de 24×24, traço de 1.5, cantos e junções arredondados.
 */

interface PropsIcone {
  className?: string;
  /** Tamanho em px. O padrão serve para texto corrido ao lado de um título. */
  tamanho?: number;
}

function Base({
  className,
  tamanho = 20,
  children,
  rotulo,
}: PropsIcone & { children: React.ReactNode; rotulo: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label={rotulo}
    >
      {children}
    </svg>
  );
}

/** Balança de dois pratos — o símbolo do julgamento equilibrado. */
export function IconeBalanca(props: PropsIcone) {
  return (
    <Base {...props} rotulo="Balança da justiça">
      {/* Haste, base e travessão. */}
      <path d="M12 6.4V20" />
      <path d="M7.5 20.5h9" />
      <path d="M4 8h16" />
      <circle cx="12" cy="5" r="1.5" />
      {/* Cordas e pratos: semicírculo, para lerem como prato pendurado e não
          como triângulo. */}
      <path d="M5.5 8v3.6" />
      <path d="M18.5 8v3.6" />
      <path d="M2.4 11.6h6.2a3.1 3.1 0 0 1-6.2 0Z" />
      <path d="M15.4 11.6h6.2a3.1 3.1 0 0 1-6.2 0Z" />
    </Base>
  );
}

/** Martelo de juiz sobre a base. */
export function IconeMartelo(props: PropsIcone) {
  return (
    <Base {...props} rotulo="Martelo do juiz">
      <path d="m4.5 13.5 5-5" />
      <rect x="8.2" y="3.6" width="7.6" height="4.2" rx="1.2" transform="rotate(45 12 5.7)" />
      <path d="m9.5 11 3.5 3.5" />
      <path d="M6 21h12" />
      <path d="M8.5 17.5h7v3.5h-7z" />
      <path d="m13.5 14.5 3-3" />
    </Base>
  );
}

/** Coluna clássica: o tribunal, a tradição, o fórum. */
export function IconeColuna(props: PropsIcone) {
  return (
    <Base {...props} rotulo="Coluna do fórum">
      <path d="M3 21h18" />
      <path d="M4 8h16" />
      <path d="m12 3 8 5H4Z" />
      <path d="M7 8v13" />
      <path d="M12 8v13" />
      <path d="M17 8v13" />
    </Base>
  );
}

/** Livro aberto — a doutrina, o manual, a disciplina. */
export function IconeLivro(props: PropsIcone) {
  return (
    <Base {...props} rotulo="Livro">
      <path d="M12 6.5C10.5 5 8.4 4.3 4 4.3v13.4c4.4 0 6.5.7 8 2.2 1.5-1.5 3.6-2.2 8-2.2V4.3c-4.4 0-6.5.7-8 2.2Z" />
      <path d="M12 6.5V20" />
    </Base>
  );
}

/** Documento com selo: o processo, a peça, o PDF que chega para análise. */
export function IconeProcesso(props: PropsIcone) {
  return (
    <Base {...props} rotulo="Processo">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 12h5" />
      <path d="M8.5 15.5h3" />
      <circle cx="15" cy="16" r="2.2" />
    </Base>
  );
}

/** Bússola: o roteiro para o caso que nunca se viu. */
export function IconeBussola(props: PropsIcone) {
  return (
    <Base {...props} rotulo="Bússola">
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5.2-5.2 2 2-5.2Z" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
    </Base>
  );
}

/** Birrete: o estudante, a graduação. */
export function IconeBirrete(props: PropsIcone) {
  return (
    <Base {...props} rotulo="Birrete de formatura">
      <path d="M12 4 2.5 8.5 12 13l9.5-4.5Z" />
      <path d="M6.5 10.8V16c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-5.2" />
      <path d="M21.5 8.5v5" />
    </Base>
  );
}

/** Pena: a redação da peça, a minuta. */
export function IconePena(props: PropsIcone) {
  return (
    <Base {...props} rotulo="Pena">
      <path d="M20 4c-7 0-11 3.5-12.5 8.5C6.6 15.6 6 18 6 20" />
      <path d="M20 4c0 7-3.5 11-8.5 12.5" />
      <path d="M9 14h5" />
      <path d="M4 20h6" />
    </Base>
  );
}

/** Selo conferido: a fonte verificada, a citação com lastro. */
export function IconeSelo(props: PropsIcone) {
  return (
    <Base {...props} rotulo="Fonte verificada">
      <path d="m12 2.8 2.6 1.9 3.2-.2.6 3.1 2.4 2.1-1.6 2.8.6 3.2-3.1.9-1.9 2.6-3-1.2-3 1.2-1.9-2.6-3.1-.9.6-3.2L2.8 9.7l2.4-2.1.6-3.1 3.2.2Z" />
      <path d="m9 11.5 2 2 4-4" />
    </Base>
  );
}

/** Questão: a prova, o simulado. */
export function IconeQuestoes(props: PropsIcone) {
  return (
    <Base {...props} rotulo="Questões">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h1.5" />
      <path d="M12 8h4" />
      <path d="M8 12h1.5" />
      <path d="M12 12h4" />
      <path d="M8 16h1.5" />
      <path d="M12 16h4" />
    </Base>
  );
}

/** Calendário com marca: o plano de estudos. */
export function IconePlano(props: PropsIcone) {
  return (
    <Base {...props} rotulo="Plano de estudos">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="m9 15 2 2 4-4" />
    </Base>
  );
}
