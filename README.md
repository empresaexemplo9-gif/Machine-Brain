# Machine Brain

**A plataforma que acompanha você do primeiro período de Direito até a advocacia.**

Não é "mais uma IA jurídica". É uma faculdade virtual que vira escritório: o mesmo
cadastro atravessa a graduação, o Exame de Ordem e a prática profissional, em dois
ambientes que dividem conta, histórico e assinatura.

| 🎓 Modo estudante | ⚖️ Modo profissional |
| --- | --- |
| Professor IA com quatro níveis de explicação | Jurista IA com postura de assistente, não de advogado |
| Grade curricular do período, disciplina por disciplina | Análise de processos (PDF, DOCX, TXT) |
| Gerador de questões (faculdade, OAB, concurso) | Roteiro "nunca vi esse caso" em oito etapas |
| Diagnóstico de desempenho por disciplina | Legislação aplicável ao caso, com fonte |
| Plano de estudos derivado dos pontos fracos | Minutas para revisão, nunca peça pronta |

## A regra que sustenta o produto

O maior risco de uma ferramenta jurídica com IA é inventar lei com confiança.
A arquitetura foi montada em volta disso:

1. **A IA não é a fonte.** O modelo só pode citar dispositivos de um catálogo
   transcrito de fonte oficial, com URL pública e data de conferência.
2. **Toda resposta é auditada.** Se ela afirmar "Art. X" sem apontar de onde
   tirou, ou citar um identificador que não existe, a interface marca o trecho
   como **não verificado** na frente do usuário.
3. **O que não existe, não se preenche.** Jurisprudência de acórdãos ainda não
   está indexada — a plataforma diz isso em vez de fabricar número de processo.
4. **Sem chave de API, nada é fabricado.** A aplicação sobe em modo demonstração
   e avisa que o modelo está desligado.

Os detalhes estão em [`docs/FUNDAMENTACAO.md`](docs/FUNDAMENTACAO.md).

## Rodando

```bash
npm install
cp .env.example .env.local     # preencha ANTHROPIC_API_KEY e MB_SESSION_SECRET
npm run dev                    # http://localhost:3000
```

Sem `ANTHROPIC_API_KEY` a aplicação sobe do mesmo jeito, em modo demonstração:
navegação, catálogo de fontes, cadastro e histórico funcionam; as respostas do
modelo são substituídas por um aviso explícito.

O banco é um arquivo SQLite criado sozinho em `data/machine-brain.db` no primeiro
acesso — não há passo de migração para rodar.

## Verificação

```bash
npm run typecheck            # tsc --noEmit
npm run verificar:catalogo   # integridade e alcançabilidade das fontes jurídicas
npm run build                # build de produção
npm run verificar:fluxos     # 24 checagens de ponta a ponta em navegador real
npm run verificar            # tudo acima, em ordem
```

`verificar:fluxos` sobe o servidor contra um banco descartável e percorre o
caminho do usuário num Chromium de verdade — **deliberadamente sem chave de
API**, porque é aí que se comprova que a plataforma avisa em vez de inventar.
Se os navegadores do Playwright não estiverem instalados na máquina, rode antes
`npx playwright install chromium`.

## Estrutura

```
src/
├── app/
│   ├── (auth)/            entrar e criar conta
│   ├── onboarding/        período, faculdade, objetivo, nível e grade
│   ├── estudante/         painel, disciplinas, Professor IA, questões, plano
│   ├── profissional/      painel, Jurista IA, documentos, roteiro de atuação
│   ├── perfil/
│   └── api/chat/          chat em streaming (NDJSON) com auditoria de citações
├── components/            Chat, Prosa (markdown + citações), PainelDeFontes…
└── lib/
    ├── fontes/            catálogo jurídico, busca BM25 e auditoria de citações
    ├── ia/                cliente do modelo, prompts e schemas de saída
    ├── servicos/          questões, documentos, roteiro, plano, desempenho
    ├── curriculo.ts       grade de referência do curso de Direito
    ├── auth.ts            sessão em cookie assinado, perfil e matrículas
    └── db.ts              SQLite e schema
```

Arquitetura e decisões: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).
Escopo de V1, V2 e V3: [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Estado atual

Este repositório entrega o **V1 (MVP)**. O que já funciona, o que está fora do
escopo e o que vem a seguir estão listados no roadmap. Um aviso honesto: os
caminhos que dependem do modelo foram exercitados apenas em modo demonstração —
a validação contra a API real ainda precisa ser feita com uma chave configurada.

---

Machine Brain é apoio ao estudo e à prática jurídica. Não substitui a análise do
advogado responsável pelo caso.
