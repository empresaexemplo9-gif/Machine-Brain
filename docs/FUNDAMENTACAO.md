# Política de fundamentação jurídica

Este documento descreve o mecanismo que impede a plataforma de apresentar
direito inventado como se fosse norma. É a decisão de produto mais importante do
projeto e a que mais restringe o resto da arquitetura.

## O problema

Um modelo de linguagem escreve "Art. 42 da Lei 9.999/1999" com exatamente a mesma
fluência com que escreve um artigo que existe. Para quem está no 2º período — ou
para quem está com prazo correndo — as duas frases são indistinguíveis. Num
produto jurídico, isso não é um defeito cosmético: é o produto falhando na função.

Não dá para resolver isso pedindo ao modelo, no prompt, que "não invente". Isso
reduz a frequência, não elimina a classe do erro, e não dá ao usuário nenhum meio
de saber quando aconteceu.

## O mecanismo

### 1. Catálogo transcrito, não gerado

`src/lib/fontes/catalogo-legislacao.ts` e `catalogo-sumulas.ts` guardam
dispositivos com o texto literal transcrito da fonte oficial. Cada registro
carrega o que o torna rastreável:

```ts
{
  id: "cf88-art5-lxviii",
  dispositivo: "Art. 5º, LXVIII",
  texto: "conceder-se-á habeas corpus sempre que…",   // literal
  url: "https://www.planalto.gov.br/…",               // endereço oficial
  origem: "Presidência da República — texto compilado",
  verificadoEm: "2026-09-02",                          // data da conferência
}
```

`npm run verificar:catalogo` falha se qualquer fonte entrar sem esses campos, ou
se ficar inalcançável pela busca do próprio assunto.

### 2. O modelo só enxerga o que foi injetado

A cada pergunta, `buscarFontes()` recupera os dispositivos pertinentes e
`montarContextoDeFontes()` os injeta no prompt dentro de um bloco `<fontes>`.
A regra dada ao modelo (`REGRA_DE_FUNDAMENTACAO`, em `src/lib/ia/prompts.ts`) é
que ele cite com o marcador `[[fonte:ID]]` e que, se algo não estiver ali, diga
"não tenho o texto oficial desse dispositivo aqui" em vez de completar de memória.

### 3. Auditoria automática de toda resposta

`auditarCitacoes()` roda sobre a resposta completa e responde duas perguntas:

| Verificação | O que detecta |
| --- | --- |
| `citacoesInvalidas` | O modelo citou um `ID` que não estava no bloco `<fontes>` — invenção de fonte. |
| `mencoesSemFonte` | Uma frase afirma "Art. 42", "Súmula 999" ou "Lei 9.999/1999" sem nenhum marcador — afirmação sem lastro. |

O resultado vira o selo exibido junto da resposta e fica gravado com a mensagem,
para que o selo continue correto quando a conversa for reaberta. Nas tarefas
estruturadas (questões, análise de documento, roteiro), IDs fora do catálogo são
descartados antes de a tela renderizar.

Uma sutileza deliberada: a checagem de menções soltas é feita **por frase**. Uma
resposta bem ancorada não é punida por voltar a dizer "o artigo 186" logo depois
de já ter citado a fonte. A contrapartida é que uma frase com um marcador válido
e uma referência solta não relacionada passa — é o limite conhecido da heurística
no V1, e a razão de a auditoria complementar a curadoria do catálogo em vez de
substituí-la.

### 4. O que não existe é dito, não preenchido

**Jurisprudência de acórdãos não está indexada.** Número de processo, órgão
julgador, relator e data são exatamente o tipo de dado que um modelo sem base
fabrica com perfeição formal. Em vez de arriscar, o V1 cobre jurisprudência
apenas por **súmulas** — enunciados numerados, estáveis e conferíveis na página
do tribunal — e orienta o usuário a buscar acórdãos na base do tribunal.

**Sem `ANTHROPIC_API_KEY`, o modelo não responde.** A plataforma entra em modo
demonstração e diz isso na tela. Nenhum texto jurídico plausível é gerado para
preencher o vazio.

**PDF sem camada de texto é recusado.** Um documento digitalizado sem OCR entrega
página em branco ao extrator. Analisar isso produziria uma "análise" de nada — o
upload é rejeitado com a orientação de passar OCR antes.

## Limites conhecidos do V1

- O catálogo é um seed curado à mão (dezenas de dispositivos), não o acervo
  brasileiro. Fora dele, o Professor IA explica o conceito e avisa que não tem o
  texto legal em mãos.
- A busca é lexical (BM25). Funciona bem nessa escala; não capta sinônimo que não
  esteja no campo `sinonimos`.
- A auditoria detecta afirmação sem lastro, não erro de interpretação: uma fonte
  correta lida de forma equivocada passa no teste.

## Caminho para o V2

1. **Ingestão automatizada** de LexML e Planalto, com o mesmo contrato de
   `Fonte` — inclusive `verificadoEm`, preenchido pelo pipeline.
2. **Busca vetorial** por cima do índice lexical. A assinatura de `buscarFontes()`
   foi desenhada para não mudar nessa troca.
3. **Indexação de jurisprudência** com metadados verificáveis, liberando o
   Pesquisador Jurídico.
4. **Radar legislativo**: acompanhar alterações e apresentar antes/depois com
   diferença destacada e impacto prático.
