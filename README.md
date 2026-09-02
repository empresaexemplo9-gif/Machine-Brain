# DRAP EDUCA

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

## Stack

Next.js 16 (App Router) e **Supabase** — Postgres com Row Level Security para os
dados, Supabase Auth para identidade. Não existe camada de backend própria entre
a aplicação e o banco: as páginas são Server Components que consultam o Supabase
com a sessão do próprio usuário, e é o RLS que garante que ninguém alcance a
linha de outro.

A aplicação **nunca usa a chave `service_role`**. Toda consulta passa pela chave
pública mais o JWT do usuário, então um erro de escopo no código vira "nenhuma
linha" em vez de vazamento.

## Rodando

### 1. Criar o projeto Supabase

No [painel do Supabase](https://supabase.com/dashboard), crie um projeto e
aplique a migração:

- **Pelo SQL Editor:** cole o conteúdo de
  [`supabase/migrations/20260902060000_esquema_inicial.sql`](supabase/migrations)
  e execute.
- **Pela CLI:** `supabase link --project-ref <ref> && supabase db push`.

Em **Authentication → Providers → Email**, desative *Confirm email* se quiser
que o cadastro já entre com sessão (recomendado em desenvolvimento).

### 2. Rodar a aplicação

```bash
npm install
cp .env.example .env.local     # preencha as variáveis do Supabase
npm run dev                    # http://localhost:3000
```

Sem `ANTHROPIC_API_KEY` a aplicação sobe do mesmo jeito, em modo demonstração:
navegação, catálogo de fontes, cadastro e histórico funcionam; as respostas do
modelo são substituídas por um aviso explícito.

Sem as variáveis do Supabase, as telas de acesso explicam o que falta em vez de
falhar com erro de conexão.

> As variáveis `NEXT_PUBLIC_` entram no bundle na hora do build. Depois de
> alterá-las, refaça o build.

## Verificação

```bash
npm run typecheck            # tsc --noEmit
npm run verificar:catalogo   # integridade e alcançabilidade das fontes jurídicas
npm run verificar:rls        # prova as políticas de RLS contra um Postgres real
npm run build                # build de produção
npm run verificar:fluxos     # 25 checagens de ponta a ponta em navegador real
npm run verificar            # tudo acima, em ordem
```

**`verificar:rls`** é o mais importante depois de mexer no schema. Ele sobe um
Postgres descartável, recria localmente o que o Supabase provê pronto (schema
`auth`, papéis, `auth.uid()`), aplica as migrações e prova que um usuário não
lê, insere, altera nem apaga a linha de outro — por nenhum caminho. Também falha
se alguma tabela nova entrar sem RLS ou sem política. Não precisa de rede nem de
projeto Supabase.

**`verificar:fluxos`** percorre o caminho do usuário num Chromium de verdade.
Precisa de um projeto Supabase e **cria contas nele** — aponte para um projeto de
desenvolvimento. Sem as variáveis definidas, o passo se pula com aviso. Roda
deliberadamente sem chave de API, porque é aí que se comprova que a plataforma
avisa em vez de inventar. Se os navegadores do Playwright não estiverem
instalados, rode antes `npx playwright install chromium`.

O CI em [`.github/workflows/verificar.yml`](.github/workflows/verificar.yml) roda
tipos, catálogo, RLS e build a cada push e PR. O percurso em navegador entra
automaticamente assim que os secrets `SUPABASE_URL_DEV` e `SUPABASE_ANON_KEY_DEV`
existirem no repositório.

## Estrutura

```
supabase/
├── migrations/            schema, políticas de RLS e trigger de cadastro
└── testes/                stub do schema auth + provas de isolamento
src/
├── app/
│   ├── (auth)/            entrar e criar conta
│   ├── onboarding/        período, faculdade, objetivo, nível e grade
│   ├── estudante/         painel, disciplinas, Professor IA, questões, plano
│   ├── profissional/      painel, Jurista IA, documentos, roteiro de atuação
│   ├── perfil/
│   └── api/chat/          chat em streaming (NDJSON) com auditoria de citações
├── proxy.ts               renova a sessão do Supabase a cada requisição
├── components/            Logo, Chat, Prosa (markdown + citações), PainelDeFontes…
└── lib/
    ├── fontes/            catálogo jurídico, busca BM25 e auditoria de citações
    ├── supabase/          clientes de servidor e de proxy
    ├── ia/                cliente do modelo, prompts e schemas de saída
    ├── servicos/          questões, documentos, roteiro, plano, desempenho
    ├── curriculo.ts       grade de referência do curso de Direito
    └── auth.ts            sessão, perfil e matrículas
```

Arquitetura e decisões: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).
Escopo de V1, V2 e V3: [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Estado atual

Este repositório entrega o **V1 (MVP)**. Dois avisos honestos:

- Os caminhos que dependem do modelo foram exercitados apenas em modo
  demonstração — a validação contra a API real ainda precisa ser feita com uma
  chave configurada.
- O schema e as políticas de RLS estão provados contra Postgres real, mas o
  percurso completo contra um projeto Supabase de verdade ainda não foi rodado.

---

DRAP EDUCA é apoio ao estudo e à prática jurídica. Não substitui a análise do
advogado responsável pelo caso.
