# DRAP JURÍDICO

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
   A auditoria também sinaliza tese atribuída a autor ("como ensina Fulano"),
   número de processo e estatística de instituição quando a obra não está no
   catálogo. Essas três são mais perigosas que artigo inventado, e por um motivo
   prático: o aluno confere um artigo no Planalto em trinta segundos; um livro
   que ele não tem, um acórdão que ele não vai puxar e um percentual atribuído
   ao CNJ, provavelmente nunca.
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
aplique as migrações de [`supabase/migrations/`](supabase/migrations) **na ordem
do nome do arquivo**:

- **Pelo SQL Editor:** cole e execute uma de cada vez, da mais antiga para a mais
  nova.
- **Pela CLI:** `supabase link --project-ref <ref> && supabase db push`.

As migrações não são idempotentes, de propósito: reaplicar a primeira num banco
que já a recebeu falha com *"relation already exists"*. Isso é o comportamento
correto de uma migração — se acontecer, ela já estava aplicada.

Em **Authentication → Providers → Email**, desative *Confirm email* se quiser
que o cadastro já entre com sessão (recomendado em desenvolvimento).

Depois de preencher o `.env.local`, confira tudo de uma vez:

```bash
npm run verificar:conexao
```

### 2. Rodar a aplicação

```bash
npm install
cp .env.example .env.local     # preencha as variáveis do Supabase
                               # (a chave é a publishable OU a anon,
                               #  conforme o que o painel mostrar)
npm run dev                    # http://localhost:3000
```

Sem chave de IA nenhuma a aplicação sobe do mesmo jeito, em modo demonstração:
navegação, catálogo de fontes, cadastro e histórico funcionam; as respostas do
modelo são substituídas por um aviso explícito. Basta **uma** das chaves da
seção *Modos de IA* abaixo para ativar.

Sem as variáveis do Supabase, as telas de acesso explicam o que falta em vez de
falhar com erro de conexão.

> As variáveis `NEXT_PUBLIC_` entram no bundle na hora do build. Depois de
> alterá-las, refaça o build.

### 3. Publicar

Num deploy não existe `.env.local`: as mesmas variáveis vão nas variáveis de
ambiente do provedor. Na Vercel, em **Settings → Environment Variables**:

| Variável | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` (ou a anon em `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| uma chave de IA | `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` ou `ANTHROPIC_API_KEY` |

Marque os ambientes em que cada uma vale. É aqui que o erro costuma acontecer:
definir só em *Preview* deixa o domínio de produção — o endereço que as pessoas
abrem — exatamente como estava.

Depois de salvar, **faça um novo deploy**. Salvar a variável não refaz o build,
e as `NEXT_PUBLIC_` já estão compiladas dentro do bundle antigo: sem o novo
build, a tela de cadastro continua mostrando *"Supabase não configurado"* mesmo
com tudo preenchido no painel.

A chave `service_role` (`sb_secret_...`) não entra em lugar nenhum: ela ignora o
RLS, e a aplicação não a usa.

Se a tela de cadastro continuar dizendo *"Supabase não configurado"*, abra
**`/diagnostico`** no próprio deploy. A página roda de dentro do processo no ar
e distingue as cinco causas com o mesmo sintoma: variável não salva, salva no
ambiente errado, deploy não refeito, migração não aplicada, ou aplicada pela
metade. É a mesma bateria de `npm run verificar:conexao` — mesmo módulo, para
não divergirem — e não imprime valor de chave nenhuma.

## Planos

Duas contas, uma diferença: quais modos de IA aparecem.

| Plano | Modos |
| --- | --- |
| **Gratuito** (padrão) | Estudo, Pesquisa, Debate — os três com nível gratuito no provedor |
| **Pro** | os três acima + Parecer (Anthropic) |

O Parecer usa API paga desde a primeira chamada, então oferecê-lo no plano
gratuito seria pôr na tela um botão que gasta dinheiro da plataforma.

O controle é em duas camadas, e as duas importam. A interface **não oferece** o
modo que o plano não cobre; o servidor **não entrega**, porque `escolherProvedor`
filtra pelo plano lido da sessão — nunca pelo corpo da requisição.

No banco há uma terceira: `perfis.plano` não é escrita pelo usuário. A política
de RLS autoriza a pessoa a alterar a própria linha, e é isso que se quer para
nome e ambiente — quem barra a coluna `plano` é um **grant por coluna**. Sem
ele, qualquer um se promovia a Pro com uma requisição usando a chave pública que
vai no bundle. RLS decide *quais linhas*; grant de coluna decide *quais campos*.
`npm run verificar:rls` prova as duas coisas, inclusive que o usuário continua
podendo trocar o próprio nome.

## Modos de IA

São quatro, e **basta um**. O usuário troca no seletor do chat; a plataforma só
oferece os que têm chave configurada.

| Modo | Provedor | Para quê | Variável |
| --- | --- | --- | --- |
| **Estudo** | Groq | O mais rápido — dúvida durante a leitura | `GROQ_API_KEY` |
| **Pesquisa** | Google Gemini | Contexto longo — cruzar vários dispositivos | `GEMINI_API_KEY` |
| **Debate** | OpenRouter | Modelos abertos variados — ouvir o contraponto | `OPENROUTER_API_KEY` |
| **Parecer** | Anthropic | O mais criterioso, e o único pago | `ANTHROPIC_API_KEY` |

Chave da Anthropic vinculada a identidade (*identity-linked*) exige também
`ANTHROPIC_WORKSPACE_ID` — sem ele a API recusa com *"anthropic-workspace-id is
required"*. Chave comum ignora o cabeçalho, então preencher quando existe é
seguro nos dois casos. E os modelos atuais **não aceitam `temperature`**: o
parâmetro foi removido e a chamada volta 400, então neste provedor a
profundidade é regulada por `output_config.effort`. Isso vale só aqui — nos três
gratuitos a temperatura continua valendo.

Os três primeiros têm nível gratuito: a plataforma funciona inteira antes de
existir plano pago. Sem nenhuma chave, ela entra em modo demonstração e diz
isso — nunca preenche o espaço com direito inventado.

Quando ninguém escolhe, vale a ordem da tabela: gratuitos primeiro, pago por
último. Assim a chave paga nunca é gasta sem alguém pedir.

**O modelo não é escolhido no código.** Nos três modos gratuitos a plataforma
pergunta ao provedor quais modelos existem hoje, descarta o que não serve para
conversa (áudio, embedding, moderação) e — no OpenRouter — o que tem preço, e
escolhe entre os que sobraram preferindo as famílias que respondem melhor.

Isso existe porque a alternativa não funciona: id fixo no código envelhece, e o
sintoma de um modelo aposentado é a plataforma parar sem aviso. A preferência é
por **família** (`llama-3.3-70b`), não por id exato, justamente para sobreviver
ao provedor trocar a versão.

Se uma chamada falhar dizendo que o modelo não existe, a plataforma esquece o
que sabia, pergunta de novo e tenta mais uma vez. Uma só: falha em série é
problema de outra natureza, e insistir esconderia isso.

`MB_MODEL_GROQ`, `MB_MODEL_GEMINI` e `MB_MODEL_OPENROUTER` continuam existindo
para fixar um modelo. Aí ele vale como escolha explícita e **não** é trocado
sozinho, nem quando o provedor o aposenta — quem fixou quis aquele, e substituir
em silêncio entregaria outra coisa. O modo pago nunca descobre modelo: trocar
sozinho ali gastaria dinheiro que ninguém autorizou.

Groq e OpenRouter falam o mesmo dialeto (`/chat/completions`), então um arquivo
atende os dois. O Gemini tem API própria e tem a sua. As três usam `fetch`
direto: nenhuma dependência nova entrou por causa disto.

A saída estruturada (questões, plano de estudos, análise de documento, roteiro)
pede ferramenta onde há suporte e aceita JSON no texto onde não há — modelo
aberto gratuito nem sempre sabe chamar ferramenta. Nos dois caminhos o resultado
passa pelo mesmo schema Zod antes de virar dado: ou o tipo certo, ou erro.

Modelos de raciocínio (Qwen3, DeepSeek-R1) emitem `<think>…</think>` junto da
resposta. Isso é removido em dois lugares: pelo parâmetro `reasoning_format` do
provedor, quando ele o conhece, e por um filtro próprio que funciona em fluxo —
inclusive quando a tag chega partida entre dois pedaços do stream. O motivo de
insistir tanto é que o rascunho não é só feio: nele o modelo cogita artigos que
depois descarta, e um "Art. 42" abandonado no meio do raciocínio viraria citação
não verificada na cara do usuário.

Em `/diagnostico` há um botão **testar agora** por modo, que faz uma chamada
real a partir do deploy e mostra a resposta do provedor. É como se descobre, sem
adivinhação, se o problema é chave recusada, modelo inexistente ou cota
estourada — três causas com o mesmo sintoma, que o provedor distingue.

Se um modo estourar o limite gratuito, a mensagem diz isso e sugere trocar. A
plataforma **não** troca sozinha: o usuário escolheu "Debate" porque queria
aquele ponto de vista, e substituí-lo em silêncio seria entregar outra coisa com
a mesma cara.

## Verificação

```bash
npm run typecheck            # tsc --noEmit
npm run verificar:catalogo   # integridade e alcançabilidade das fontes jurídicas
npm run verificar:provedores # protocolo dos provedores de IA, contra servidor de teste
npm run verificar:rls        # prova as políticas de RLS contra um Postgres real
npm run verificar:conexao    # diagnostica o projeto Supabase configurado
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

**`verificar:catalogo`** confere as fontes e a auditoria. Nas fontes: id único,
texto transcrito, URL oficial e data de conferência; e, para doutrina, artigo e
dado, autoria mais um localizador que **não dá para inventar** — ISBN com dígito
verificador que fecha, DOI no formato `10.XXXX/sufixo`, ou URL https. Um ISBN
plausível mas falso é rejeitado pela aritmética, sem depender de alguém reparar.
Na auditoria: 9 afirmações que precisam ser sinalizadas e 7 frases corretas que
não podem ser. As duas listas existem porque as duas falhas custam caro em
direções opostas — deixar passar entrega invenção com selo de verificada; marcar
demais destrói a confiança no selo.

**`verificar:provedores`** sobe um servidor local que responde como Groq,
OpenRouter e Gemini respondem, e faz os provedores de verdade falarem com ele.
Não valida chave nem cota do provedor real — valida o que é nosso, que é a
interpretação da resposta: remontar fluxo SSE cortado no meio de uma linha,
ignorar keep-alive que não é JSON, traduzir o papel `assistant` para `model` no
Gemini, aceitar JSON no texto quando o modelo não sabe chamar ferramenta, e
transformar o 429 em mensagem que diz o que fazer. É parser, que é o código que
passa na revisão e quebra no ar. Não precisa de rede nem de chave.

**`verificar:conexao`** é o primeiro comando a rodar depois de criar o projeto.
Ele responde, em ordem, o que costuma dar errado: as variáveis estão certas (e
não é a `service_role` por engano), o projeto responde, a migração foi aplicada,
e — o que mais importa — uma consulta **sem sessão** é recusada. Se alguma tabela
devolver dado sem sessão, ele falha alto: seria qualquer pessoa com a chave
pública lendo o banco.

**`verificar:fluxos`** percorre o caminho do usuário num Chromium de verdade.
Precisa de um projeto Supabase e **cria contas nele** — aponte para um projeto de
desenvolvimento. Sem as variáveis definidas, o passo se pula com aviso. Roda
deliberadamente sem chave de API, porque é aí que se comprova que a plataforma
avisa em vez de inventar. Se os navegadores do Playwright não estiverem
instalados, rode antes `npx playwright install chromium`.

O CI em [`.github/workflows/verificar.yml`](.github/workflows/verificar.yml) roda
tipos, catálogo, RLS e build a cada push e PR. O diagnóstico de conexão e o
percurso em navegador entram automaticamente assim que os secrets
`SUPABASE_URL_DEV` e `SUPABASE_PUBLISHABLE_KEY_DEV` (ou `SUPABASE_ANON_KEY_DEV`)
existirem no repositório — aponte-os para um projeto de **desenvolvimento**,
porque o percurso cria contas.

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

DRAP JURÍDICO é apoio ao estudo e à prática jurídica. Não substitui a análise do
advogado responsável pelo caso.
