/**
 * Marca DRAP EDUCA.
 *
 * O símbolo do "D" é reproduzido como está na identidade — silhueta de D com a
 * barra diagonal em negativo, subindo da base à esquerda para o topo à direita.
 * A geometria não muda. O que foi adaptado são apenas as cores, para a paleta
 * escura da plataforma: onde a marca original põe o navy sobre branco, aqui o
 * símbolo e "DRAP" ficam claros sobre o fundo escuro e "EDUCA" assume o azul de
 * destaque — a mesma relação de duas cores do original.
 *
 * A diagonal é recortada por máscara, não desenhada por cima: assim ela mostra
 * o fundo real (seja qual for a superfície) e, principalmente, fica contida
 * dentro do D. Um traço solto sobrando acima e abaixo da silhueta seria uma
 * mudança no desenho da marca, não uma adaptação de cor.
 */

/** Só o símbolo — para favicon, avatar e usos compactos. */
export function MarcaD({
  className = "",
  cor = "currentColor",
}: {
  className?: string;
  cor?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="DRAP"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Branco pinta, preto recorta. O identificador é fixo de propósito: a
            marca aparece várias vezes na mesma página e uma máscara só basta. */}
        <mask id="drap-corte-diagonal" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect x="0" y="0" width="64" height="64" fill="#fff" />
          <path d="M 12 66 L 31.5 -2 H 38.5 L 19 66 Z" fill="#000" />
        </mask>
      </defs>

      <path
        d="M 4 3 H 30 A 29 29.5 0 0 1 30 61 H 4 Z"
        fill={cor}
        mask="url(#drap-corte-diagonal)"
      />
    </svg>
  );
}

/** Marca completa: símbolo, "DRAP" e "EDUCA". */
export function Logo({
  className = "",
  tamanho = "normal",
}: {
  className?: string;
  tamanho?: "normal" | "grande";
}) {
  const grande = tamanho === "grande";

  return (
    <span className={`inline-flex items-center ${grande ? "gap-3" : "gap-2"} ${className}`}>
      <MarcaD
        className={`${grande ? "h-10" : "h-7"} w-auto shrink-0 text-[var(--color-texto)]`}
      />
      <span className="flex flex-col leading-none">
        <span
          className={`${grande ? "text-2xl" : "text-base"} font-extrabold leading-none tracking-tight text-[var(--color-texto)]`}
        >
          DRAP
        </span>
        <span
          className={`${grande ? "mt-1 text-[0.62rem]" : "mt-0.5 text-[0.44rem]"} font-bold leading-none tracking-[0.4em] text-[var(--color-acento)]`}
        >
          EDUCA
        </span>
      </span>
    </span>
  );
}
