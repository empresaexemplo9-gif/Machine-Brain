# Roadmap

## V1 — MVP (entregue neste repositório)

| # | Item | Situação |
| --- | --- | --- |
| 1 | Login e cadastro | ✅ Supabase Auth, sessão em cookie httpOnly |
| 2 | Perfil do estudante | ✅ período, faculdade, objetivo, nível e grade ajustável |
| 3 | Professor IA | ✅ streaming, 4 níveis, botão "ainda não entendi" |
| 4 | Biblioteca de matérias | ✅ 40 disciplinas em 10 períodos, com ementa e temas |
| 5 | Chat por disciplina | ✅ busca de fontes restrita às áreas da disciplina |
| 6 | Gerador de questões | ✅ faculdade/OAB/concurso, correção comentada |
| 7 | Plano de estudos | ✅ derivado do desempenho medido, com ação verificável |
| 8 | Área profissional | ✅ Jurista IA, painel e histórico próprios |
| 9 | Upload de PDF para análise | ✅ PDF, DOCX, TXT; digitalizado sem OCR é recusado |
| 10 | Respostas com fontes jurídicas | ✅ catálogo verificado + auditoria de citações |

Itens do V1 que ganharam escopo além do previsto: diagnóstico de desempenho por
disciplina com semáforo, e o roteiro "nunca vi esse caso" em oito etapas.

### Fora do escopo do V1, por decisão

- **Jurisprudência de acórdãos.** Exigiria número de processo, relator e data —
  o dado que um modelo sem base indexada fabrica melhor. Coberto por súmulas.
- **Pagamento e planos.** A monetização está desenhada, não implementada.
- **Voz.** Depende de infraestrutura de áudio que não muda a tese do produto.

## V2 — Profundidade

1. **Ingestão automatizada de legislação** (LexML, Planalto) com o mesmo contrato
   de `Fonte`. É o desbloqueio de todo o resto: hoje o catálogo é curado à mão.
2. **Busca vetorial** sobre o acervo ampliado, mantendo BM25 como reforço.
3. **Indexação de jurisprudência** com metadados verificáveis → **Pesquisador
   Jurídico** ("existem decisões favoráveis a essa tese?").
4. **Radar legislativo**: monitorar alterações e apresentar antes/depois, o que
   mudou, quem é afetado e o impacto prático.
5. **Modo voz** — "estudar conversando" no carro ou na academia, com a IA fazendo
   as perguntas.
6. **Aulas com IA**: aula estruturada por tema, interrompível ("professor, pode
   voltar?").
7. **Casos práticos**: situação realista, o aluno decide a cada passo e recebe
   avaliação por raciocínio jurídico, legislação, argumentação e estratégia.
8. **Gerador de documentos** ampliado: contratos, notificações, pareceres,
   recursos — sempre como minuta para revisão.

## V3 — Escala

1. **Simulação de escritório**: a IA faz o papel de cliente, o aluno conduz a
   entrevista, identifica o problema, pesquisa, escolhe a estratégia, produz a
   peça e recebe a avaliação. É o diferencial mais difícil de copiar.
2. **Análise processual avançada**: linha do tempo dos autos, cruzamento de
   peças, controle de prazos.
3. **Aplicativo móvel**, aproveitando o modo voz.
4. **Plano Escritório**: múltiplos usuários, biblioteca interna, base de
   conhecimento do escritório, controle de acesso. Em Postgres isso vira uma
   tabela de organizações e políticas de RLS por pertencimento, não por dono —
   a mudança é nas políticas, não na aplicação.
5. **Professor com avatar**, se o V2 mostrar que a aula em vídeo prende mais que
   o texto.

## Monetização desenhada

| Plano | Faixa | Contém |
| --- | --- | --- |
| Gratuito | — | Perguntas por dia limitadas, conteúdo básico, questões limitadas |
| Estudante | R$ 19,90–29,90/mês | Professor IA, aulas, simulados, plano, biblioteca, voz |
| Profissional | R$ 49,90–99,90/mês | Pesquisa, análise de documentos, jurisprudência, radar, minutas |
| Escritório | R$ 199+/mês | Múltiplos usuários, biblioteca interna, IA privada, gestão |

O V1 não implementa cobrança. A estrutura de dados já separa usuário de perfil e
de ambiente, que é o necessário para plugar planos sem reescrita.

## Dívida técnica assumida

- Sem testes unitários; a cobertura vem do verificador de catálogo, das provas
  de RLS e do percurso em navegador.
- Os caminhos que dependem do modelo foram exercitados apenas em modo
  demonstração — falta uma passada com chave de API real.
- O percurso completo contra um projeto Supabase de verdade ainda não foi
  rodado; o que está provado é o schema e o isolamento por RLS.
- `definirMatriculas()` apaga e reinsere sem transação, porque são duas chamadas
  HTTP. Uma falha no meio deixa o aluno sem grade e ele refaz o onboarding.
- `historicoParaModelo()` corta em 12 turnos por contagem, não por tokens.
- O arquivo de migração é único. A segunda mudança de schema precisa virar uma
  migração nova, nunca uma edição desta.
