import type { CSSProperties } from "react";

/**
 * Marca DRAP JURÍDICO.
 *
 * A marca inteira é vetor — símbolo E tipografia. Nada aqui depende de fonte
 * instalada nem de webfont: um logo que muda de forma conforme a máquina do
 * usuário não é um logo. Os caminhos foram gerados a partir da arte original e
 * das fontes convertidas em contornos (ver docs/MARCA.md).
 *
 * Como a geometria foi obtida, e por que não deve ser ajustada no olho:
 *
 *  - O símbolo saiu de um traçado dos pixels da arte: bordas retas por mínimos
 *    quadrados, cantos por Béziers cúbicas. Sobrepõe o original em 99,5%.
 *  - São DUAS peças separadas, haste e bojo — não uma peça com um traço branco
 *    por cima. O vão entre elas é AFUNILADO (5,6 unidades no topo, 1,1 na base),
 *    então um traço de espessura constante não o reproduz.
 *  - O bojo não é semicírculo: tem base reta e um trecho reto na lateral
 *    direita (26% da altura), com os cantos arredondados entre eles.
 *  - "JURÍDICO" tem exatamente a largura de "DRAP", como "EMPRESA" tinha na arte
 *    original (766px contra 770px). O entrelinhamento foi calculado para casar
 *    as duas larguras, não estimado.
 *
 * Se a identidade mudar, refaça a geração a partir do vetor oficial.
 */

/** Navy da identidade, medido na arte original. */
export const NAVY_DRAP = "#131929";

const MARCA_LARG = 101.42;
const MARCA_ALT = 99.76;
const LOCKUP_LARG = 304.25;

const HASTE = "M 0 0 L 75.03 0 L 32.39 99.76 L 0 99.76 Z";
const BOJO = "M 79.68 1.89 L 33.41 99.76 L 74.06 99.76 C 84.45 98.22 93.37 89.98 97.17 81.37 C 100.07 75.93 100.9 69.63 101.42 63.21 L 101.42 36.79 C 100.76 22.58 94.79 8.18 80.19 1.89 Z";
const DRAP = "M169.47 35.01Q169.47 41.97 166.4 47.37Q163.32 52.78 157.68 55.75Q152.04 58.73 144.6 58.73H126.83V11.29H144.6Q152.1 11.29 157.71 14.26Q163.32 17.23 166.4 22.61Q169.47 27.98 169.47 35.01ZM157.71 35.01Q157.71 28.45 154.06 24.8Q150.42 21.15 143.86 21.15H138.39V48.73H143.86Q150.42 48.73 154.06 45.14Q157.71 41.56 157.71 35.01Z M198.97 58.73 189.1 40.82H186.33V58.73H174.77V11.29H194.17Q199.78 11.29 203.73 13.25Q207.68 15.21 209.64 18.62Q211.6 22.03 211.6 26.22Q211.6 30.95 208.93 34.67Q206.26 38.39 201.06 39.94L212.01 58.73ZM186.33 32.64H193.49Q196.67 32.64 198.26 31.09Q199.84 29.53 199.84 26.7Q199.84 23.99 198.26 22.44Q196.67 20.88 193.49 20.88H186.33Z M247.18 50.35H229.47L226.64 58.73H214.54L231.7 11.29H245.08L262.25 58.73H250.02ZM244.21 41.43 238.33 24.06 232.52 41.43Z M284.99 41.7H277.82V58.73H266.27V11.29H284.99Q290.66 11.29 294.58 13.25Q298.5 15.21 300.46 18.65Q302.42 22.1 302.42 26.56Q302.42 30.68 300.53 34.09Q298.64 37.51 294.72 39.6Q290.8 41.7 284.99 41.7ZM290.66 26.56Q290.66 23.72 289.04 22.17Q287.42 20.61 284.11 20.61H277.82V32.51H284.11Q287.42 32.51 289.04 30.95Q290.66 29.4 290.66 26.56Z";
const JURIDICO = "M124.26 96.1H121.96V92.64H123.39Q124.62 92.64 125.21 92.02Q125.81 91.41 125.81 90.27V74.71H123.45V71.7H132.29V74.71H130.25V90.18Q130.25 93.06 128.74 94.58Q127.24 96.1 124.26 96.1Z M149.84 90.89Q147.18 90.89 145.27 89.93Q143.36 88.98 142.36 87.18Q141.36 85.39 141.36 82.83V74.71H139.32V71.7H147.8V74.71H145.79V82.8Q145.79 84.35 146.31 85.37Q146.83 86.39 147.8 86.88Q148.77 87.36 150.13 87.36Q151.49 87.36 152.47 86.88Q153.46 86.39 153.98 85.37Q154.5 84.35 154.5 82.8V74.71H152.46V71.7H160.32V74.71H158.28V82.83Q158.28 85.48 157.28 87.28Q156.28 89.08 154.38 89.98Q152.49 90.89 149.84 90.89Z M167.52 90.57V87.56H169.52V74.71H167.52V71.7H178.13Q181.6 71.7 183.42 73.11Q185.25 74.51 185.25 77.39Q185.25 80.31 183.42 81.7Q181.6 83.09 178.36 83.09H177.74L181.18 81.6L184.83 87.56H187.1V90.57H181.5L176.94 83.09H175.38V80.08H177.36Q179.1 80.08 179.9 79.37Q180.69 78.66 180.69 77.39Q180.69 76.1 179.95 75.4Q179.2 74.71 177.36 74.71H173.96V87.56H176V90.57Z M193.81 90.57V87.56H195.81V74.71H193.81V71.7H202.29V74.71H200.25V87.56H202.29V90.57ZM196.98 69.82 198.31 64.61H201.87L199.15 69.82Z M209.71 90.57V87.56H211.71V74.71H209.71V71.7H220.06Q223.66 71.7 225.97 72.86Q228.28 74.03 229.43 76.13Q230.58 78.24 230.58 81.12Q230.58 84.03 229.47 86.15Q228.35 88.27 226.04 89.42Q223.72 90.57 220.13 90.57ZM216.15 87.56H219.68Q222.01 87.56 223.38 86.81Q224.76 86.07 225.37 84.61Q225.99 83.15 225.99 81.12Q225.99 79.08 225.37 77.64Q224.76 76.2 223.37 75.45Q221.97 74.71 219.68 74.71H216.15Z M238.1 90.57V87.56H240.11V74.71H238.1V71.7H246.58V74.71H244.54V87.56H246.58V90.57Z M264.52 90.89Q261.35 90.89 259 89.64Q256.66 88.4 255.38 86.2Q254.1 84 254.1 81.18Q254.1 78.27 255.36 76.05Q256.62 73.83 258.84 72.59Q261.06 71.34 263.91 71.34Q266.72 71.34 268.65 72.51Q270.57 73.67 271.35 76.1L270.28 75.39V71.7H273.23V78.27H270.41Q269.63 76.52 268.14 75.68Q266.66 74.84 264.84 74.84Q262.93 74.84 261.56 75.63Q260.18 76.42 259.44 77.83Q258.69 79.24 258.69 81.15Q258.69 83.03 259.41 84.43Q260.12 85.84 261.45 86.62Q262.77 87.39 264.62 87.39Q266.59 87.39 267.98 86.42Q269.37 85.45 270.22 83.28L273.55 84.87Q272.58 87.78 270.28 89.34Q267.98 90.89 264.52 90.89Z M291.62 90.89Q288.45 90.89 286.08 89.64Q283.72 88.4 282.43 86.18Q281.13 83.96 281.13 81.12Q281.13 78.24 282.43 76.03Q283.72 73.83 286.08 72.59Q288.45 71.34 291.62 71.34Q294.79 71.34 297.14 72.59Q299.48 73.83 300.79 76.03Q302.1 78.24 302.1 81.12Q302.1 83.96 300.79 86.18Q299.48 88.4 297.14 89.64Q294.79 90.89 291.62 90.89ZM291.62 87.39Q293.4 87.39 294.73 86.63Q296.05 85.87 296.78 84.47Q297.51 83.06 297.51 81.15Q297.51 79.21 296.78 77.8Q296.05 76.39 294.73 75.61Q293.4 74.84 291.62 74.84Q289.81 74.84 288.48 75.61Q287.15 76.39 286.44 77.8Q285.73 79.21 285.73 81.15Q285.73 83.06 286.44 84.47Q287.15 85.87 288.48 86.63Q289.81 87.39 291.62 87.39Z";

/** Só o símbolo — favicon, avatar, usos compactos. */
export function MarcaD({
  className = "",
  style,
  cor = "currentColor",
}: {
  className?: string;
  style?: CSSProperties;
  cor?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${MARCA_LARG} ${MARCA_ALT}`}
      className={className}
      style={style}
      role="img"
      aria-label="DRAP"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={HASTE} fill={cor} />
      <path d={BOJO} fill={cor} />
    </svg>
  );
}

/** Marca completa: símbolo + "DRAP" + "JURÍDICO". */
export function Logo({
  className = "",
  altura = 26,
  tom = "claro",
}: {
  className?: string;
  /** Altura do símbolo em px; o resto do lockup escala junto. */
  altura?: number;
  /** "claro" para fundo escuro; "navy" para fundo claro, na cor da marca. */
  tom?: "claro" | "navy";
}) {
  return (
    <svg
      viewBox={`0 0 ${LOCKUP_LARG} ${MARCA_ALT}`}
      className={className}
      style={{ height: altura, width: (altura * LOCKUP_LARG) / MARCA_ALT }}
      role="img"
      aria-label="DRAP Jurídico"
      xmlns="http://www.w3.org/2000/svg"
      fill={tom === "navy" ? NAVY_DRAP : "var(--color-texto)"}
    >
      <path d={HASTE} />
      <path d={BOJO} />
      <path d={DRAP} />
      <path d={JURIDICO} />
    </svg>
  );
}
