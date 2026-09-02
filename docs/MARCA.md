# A marca

A logo DRAP JURÍDICO no código é **100% vetor** — símbolo e tipografia. Nada
depende de fonte instalada nem de webfont. Um logo que muda de forma conforme a
máquina de quem abre a página não é um logo.

Este documento registra como a geometria foi obtida, porque ela não deve ser
ajustada no olho.

## De onde vieram os números

A arte original chegou como imagem raster. Em vez de redesenhar por observação,
a geometria foi **extraída dos pixels**:

| Etapa | Método | Resultado |
| --- | --- | --- |
| Recorte do símbolo | Limiar de luminância + varredura de colunas | x 404–833, y 162–585 (430×424 px) |
| Bordas retas | Ajuste de reta por mínimos quadrados | desvio máximo 1–2 px |
| Cantos arredondados | Béziers cúbicas por mínimos quadrados, com divisão adaptativa | erro máximo ≈ 1 px |
| Conferência | Renderização do SVG e comparação pixel a pixel com a arte | **IoU 99,48%** |

O que sobra dos 0,5% é a franja de antialiasing da imagem de origem.

Cor da identidade, medida no miolo da marca: **`#131929`**.

## Três detalhes que um desenho "de memória" erra

1. **São duas peças separadas** — a haste e o bojo —, não uma peça com um traço
   branco por cima. Desenhar como traço por cima quebra assim que a marca é
   usada sobre qualquer fundo que não seja o previsto.

2. **O vão diagonal é afunilado**: 5,55 unidades no topo e 1,06 na base (altura
   do símbolo = 100). As duas bordas têm inclinações diferentes — `-0,4274` na
   haste e `-0,4728` no bojo. Um traço de espessura constante não reproduz isso.

3. **O bojo não é um semicírculo.** Ele tem base reta, um trecho **reto** na
   lateral direita (de y 36,79 a 63,21 — 26% da altura) e os cantos arredondados
   entre eles. Um arco simples deixa a marca visivelmente mais gorda no meio.

## A tipografia

As famílias não foram escolhidas por semelhança aparente: cada candidata foi
renderizada, normalizada pela altura de caixa alta e comparada pixel a pixel com
a palavra correspondente da arte original.

**"DRAP" — Poppins 700**

| Candidata | Sobreposição | Largura vs. original |
| --- | --- | --- |
| **Poppins 700** | **86,7%** | **99,9%** |
| Poppins 800 | 80,6% | 100,4% |
| Montserrat 700 | 80,6% | 100,0% |
| Montserrat 800 | 79,6% | 100,6% |

**Descritor — Rokkitt 700** (comparado contra "EMPRESA" da arte, com
entrelinhamento calibrado para as larguras casarem)

| Candidata | Sobreposição |
| --- | --- |
| **Rokkitt 700** | **60,9%** |
| Rokkitt 800 | 60,7% |
| Zilla Slab 700 | 51,6% |
| Bitter 700 | 51,0% |
| Arvo 700 | 45,5% |
| Roboto Slab 700 | 39,2% |

Poppins e Rokkitt estão sob a SIL Open Font License. No repositório não há
arquivo de fonte: os glifos usados foram **convertidos em contornos**, que é o
que se faz num arquivo de marca.

## Proporções do conjunto

Medidas na arte, com a altura do símbolo = 100 unidades:

| Elemento | Valor |
| --- | --- |
| Largura do símbolo | 101,42 |
| Vão símbolo → texto | 21,2 |
| "DRAP": altura de caixa alta | 47,6 |
| "DRAP": largura | 181,6 |
| Descritor: altura de caixa alta | 18,9 |
| Descritor: largura | 180,7 |

O detalhe que faz o conjunto ler como o original: **o descritor tem exatamente a
largura da primeira palavra** — na arte, "EMPRESA" mede 766 px contra 770 px de
"DRAP". Como "JURÍDICO" tem outra contagem de letras, entrelinhar por tentativa
erraria; o espaçamento foi calculado para casar as larguras.

## Como usar

```tsx
import { Logo, MarcaD, NAVY_DRAP } from "@/components/Logo";

<Logo />                        // fundo escuro (padrão da plataforma)
<Logo altura={40} />            // maior
<Logo tom="navy" />             // fundo claro, na cor da identidade
<MarcaD className="h-8" />      // só o símbolo
```

Sobre fundo escuro a marca sai clara, e sobre fundo claro sai no navy da
identidade — versão positiva e negativa, como manda o uso normal de uma marca.
O navy do original sobre o fundo escuro da plataforma seria ilegível.

## Se a identidade mudar

Refaça a extração a partir do **vetor oficial** (SVG, AI ou EPS), não de uma
imagem. Com o vetor em mãos os caminhos saem diretos, sem a etapa de traçado e
sem o erro residual de 0,5%.
