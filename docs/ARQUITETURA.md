# Arquitetura

## Visão geral

Aplicação Next.js (App Router) única sobre Supabase, servindo os dois ambientes
do produto. Não há uma camada de backend própria entre a aplicação e o banco: as
páginas são Server Components que consultam o Postgres do Supabase com a sessão
do próprio usuário, as mutações são Server Actions, e a única Route Handler é o
chat — que precisa de streaming.

```
navegador
   │
   ├── proxy.ts ───────────► renova a sessão a cada requisição
   ├── Server Components ──► src/lib/servicos ──► Supabase (RLS)
   ├── Server Actions ─────► src/lib/servicos ──► Supabase (RLS) + modelo
   └── POST /api/chat ─────► streaming NDJSON ──► modelo + auditoria de citações
```

## Decisões e o porquê

### O RLS é a barreira, não o código da aplicação

Toda tabela guarda dado de um usuário e nada é público. Em vez de espalhar
`where usuario_id = ...` por dezenas de consultas — onde uma omissão vira
vazamento silencioso —, a separação vive no banco: RLS ligado em todas as
tabelas, política única de `auth.uid() = usuario_id`, e nenhuma leitura anônima
em lugar nenhum.

Consequência direta: **a aplicação nunca usa a chave `service_role`**. Ela
ignoraria o RLS e devolveria a responsabilidade ao código. Com a chave pública
mais o JWT do usuário, um erro de escopo produz "nenhuma linha" em vez de dado
alheio.

O trecho que mais merece leitura é
[`supabase/migrations`](../supabase/migrations): ali estão as políticas, o
trigger que cria o perfil no cadastro e a razão de `mensagens` carregar o dono
repetido (com chave estrangeira composta para essa cópia não poder divergir).

`npm run verificar:rls` prova isso contra um Postgres de verdade e falha se
qualquer tabela nova entrar sem política.

### Uma plataforma, dois ambientes

Estudante e Profissional compartilham conta, banco, catálogo de fontes e camada
de IA. Só mudam o prompt, a navegação e as telas. É a tradução técnica da tese do
produto: quem entra no 1º período continua cliente quando começa a advogar, e
migrar de ambiente não pode custar uma nova conta.

### Identidade no Supabase Auth

E-mail e senha vivem em `auth.users`; a sessão anda em cookies `httpOnly`
gerenciados por `@supabase/ssr`. O que é do produto — nome, ambiente, período,
grade — fica em tabelas nossas.

`src/proxy.ts` roda antes de cada página e renova o token. Sem esse passo o
usuário seria deslogado no meio de uma sessão de estudo: o token dura cerca de
uma hora e Server Components não podem gravar cookies. A leitura de sessão usa
sempre `getUser()`, que valida no servidor de autenticação, nunca `getSession()`,
que confiaria num cookie que o navegador pode ter adulterado.

### Rotas que dependem de sessão são explicitamente dinâmicas

As rotas autenticadas declaram `export const dynamic = "force-dynamic"`. Sem
isso, um build feito sem as variáveis do Supabase as pré-renderiza — porque aí a
leitura de sessão nem chega a tocar nos cookies — e o resultado é uma página
congelada em "deslogado" para todo mundo. A garantia não pode depender de a
configuração estar presente na hora de compilar.

### Streaming com auditoria no fim

`/api/chat` responde NDJSON: uma linha por evento.

```
{"tipo":"inicio","conversaId":12}
{"tipo":"texto","valor":"O habeas corpus "}
{"tipo":"texto","valor":"protege a liberdade…"}
{"tipo":"fim","fontes":[…],"auditoria":{…}}
```

A auditoria de citações só pode rodar sobre a resposta inteira, então ela é
necessariamente o último evento — e o selo de verificação só aparece quando
chega. Se o modelo falhar no meio, o que já foi gerado é gravado com a marca da
interrupção, em vez de sumir.

### Saída estruturada por ferramenta

Questões, análise de documento, roteiro e plano usam `gerarEstruturado()`: o
schema Zod vira uma ferramenta e o modelo é obrigado a usá-la, então o retorno
chega como JSON em vez de texto para garimpar. A validação Zod por cima cobre o
caso de o formato estar certo e o conteúdo fora do domínio.

### Renderização do markdown sem biblioteca

`components/Prosa.tsx` monta elementos React a partir do texto do modelo. Foi
escrito à mão por dois motivos: o subconjunto de markdown usado é pequeno, e o
marcador `[[fonte:ID]]` precisa virar um elemento de interface, não texto. Como
nada passa por HTML cru, não há superfície de XSS na renderização.

### A marca

`components/Logo.tsx` reproduz a identidade DRAP: a silhueta do "D" com a
diagonal em negativo. A geometria não muda — só as cores foram adaptadas para o
fundo escuro. A diagonal é recortada por máscara, e não desenhada por cima, para
mostrar o fundo real e ficar contida dentro do D em qualquer superfície.

## Mapa dos módulos

| Módulo | Responsabilidade |
| --- | --- |
| `supabase/migrations/` | Schema, políticas de RLS, trigger de cadastro |
| `supabase/testes/` | Stub do schema `auth` e provas de isolamento entre usuários |
| `lib/supabase/` | Clientes de servidor e de proxy, e leitura da configuração |
| `lib/fontes/` | Catálogo jurídico, busca BM25 e auditoria de citações |
| `lib/curriculo.ts` | Grade de referência: disciplinas, períodos, áreas e temas |
| `lib/ia/cliente.ts` | Acesso ao modelo, streaming, saída estruturada, modo demonstração |
| `lib/ia/prompts.ts` | Persona do Professor e do Jurista, e a regra de fundamentação |
| `lib/ia/schemas.ts` | Formatos exigidos nas tarefas estruturadas |
| `lib/servicos/` | Regras de negócio: questões, documentos, roteiro, plano, desempenho |
| `lib/auth.ts` | Cadastro, login, sessão, perfil e matrículas |

`lib/curriculo.ts` é o elo entre as duas metades: cada disciplina declara as
`areas` que restringem a busca no catálogo jurídico e os `temas` que alimentam o
gerador de questões e o plano de estudos.

## Fronteira servidor/cliente

Módulos com acesso ao banco ou ao modelo carregam `import "server-only"`. Um
componente de cliente que tente importá-los quebra o build — o que já aconteceu
uma vez neste projeto, com as constantes do gerador de questões, e é por isso que
elas moram em `lib/opcoes-questoes.ts`, fora do serviço.

## Verificação

- `npm run typecheck` — tipos.
- `npm run verificar:catalogo` — nenhuma fonte sem texto literal, URL oficial e
  data de conferência; nenhuma fonte inalcançável pela busca.
- `npm run verificar:rls` — Postgres descartável, migrações aplicadas e prova de
  que nenhum usuário alcança a linha de outro. Não precisa de rede.
- `npm run verificar:fluxos` — 25 checagens num Chromium real contra um projeto
  Supabase de desenvolvimento, **sem chave de API**, cobrindo cadastro,
  onboarding, os dois ambientes, upload de PDF (com e sem camada de texto) e
  proteção de rotas.
