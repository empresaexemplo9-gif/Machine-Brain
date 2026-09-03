/**
 * Fachada de fórum — o elemento ilustrado do herói.
 *
 * Vetor, não imagem: escala em qualquer tela sem peso de download, acompanha a
 * cor da marca e não depende de nenhum arquivo externo. Frontão, seis colunas,
 * escadaria e a balança no tímpano.
 *
 * `aria-hidden` de propósito: é decoração. Quem usa leitor de tela já recebeu o
 * título e o texto ao lado — anunciar "ilustração de um fórum" só atrasaria a
 * leitura do que importa.
 */
export function Fachada({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 260"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* gradientUnits="userSpaceOnUse" é obrigatório aqui, não preferência.
            No padrão (objectBoundingBox) as coordenadas do gradiente são
            relativas à caixa de cada elemento pintado — e uma linha reta
            horizontal tem caixa de altura zero. O gradiente fica degenerado e a
            linha simplesmente não pinta. Era por isso que só o frontão aparecia:
            ele tem área; as colunas e os degraus, não. */}
        <linearGradient id="fachada-ouro" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="260">
          <stop offset="0%" stopColor="var(--color-ouro-claro)" stopOpacity="1" />
          <stop offset="55%" stopColor="var(--color-ouro)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="var(--color-ouro)" stopOpacity="0.45" />
        </linearGradient>
      </defs>

      <g stroke="url(#fachada-ouro)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Frontão */}
        <path d="M160 18 300 78H20Z" />
        <path d="M20 78h280" />
        <path d="M28 92h264" />

        {/* Colunas */}
        {[46, 92, 138, 184, 230, 276].map((x) => (
          <g key={x}>
            <path d={`M${x - 9} 92h18`} />
            <path d={`M${x - 6} 92v104`} />
            <path d={`M${x + 6} 92v104`} />
            <path d={`M${x - 10} 196h20`} />
          </g>
        ))}

        {/* Escadaria */}
        <path d="M14 208h292" />
        <path d="M6 222h308" />
        <path d="M0 236h320" />

        {/* Balança no tímpano */}
        <g transform="translate(160 52)">
          <path d="M0 -12v22" />
          <path d="M-7 10h14" />
          <path d="M-16 -8h32" />
          <path d="M-13 -8v6" />
          <path d="M13 -8v6" />
          <path d="M-19 -2h12a6 6 0 0 1-12 0Z" />
          <path d="M7 -2h12a6 6 0 0 1-12 0Z" />
          <circle cx="0" cy="-14" r="2.4" />
        </g>
      </g>
    </svg>
  );
}
