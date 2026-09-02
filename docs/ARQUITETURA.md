# Arquitetura

## Visão geral

Aplicação Next.js (App Router) única, servindo os dois ambientes do produto.
Não há frontend e backend separados: as páginas são Server Components que leem o
banco direto, as mutações são Server Actions, e a única Route Handler é o chat —
que precisa de streaming.

```
navegador
   │
   ├── Server Components ──► src/lib/servicos ──► SQLite
   ├── Server Actions ─────► src/lib/servicos ──► SQLite + modelo
   └── POST /api/chat ─────► streaming NDJSON ──► modelo + auditoria
```

## Decisões e o porquê

### Uma plataforma, dois ambientes

Estudante e Profissional compartilham conta, banco, catálogo de fontes e camada
de IA. Só mudam o prompt, a navegação e as telas. É a tradução técnica da tese do
produto: quem entra no 1º período continua cliente quando começa a advogar, e
migrar de ambiente não pode custar uma nova conta.

`Cabecalho` mantém a troca sempre visível para tornar essa continuidade explícita.

### SQLite

O produto inteiro cabe num arquivo, sobe sem infraestrutura e permite mexer no
modelo de dados sem cerimônia. A migração para Postgres está prevista para o
plano Escritório, onde múltiplos usuários por conta e acesso concorrente pesado
mudam o cálculo.

O schema vive em `src/lib/db.ts` e é aplicado na primeira conexão. Não há
ferramenta de migração no V1 — decisão consciente para um MVP pré-produção.

### Sessão em cookie assinado

JWT HS256 (`jose`) em cookie `httpOnly`, senha com `bcrypt`. Sem serviço externo
de identidade, sem tabela de sessões. `MB_SESSION_SECRET` ausente ou curto faz a
aplicação falhar na hora, em vez de assinar sessões com segredo previsível.

O login devolve a mesma mensagem para e-mail inexistente e senha errada, e paga o
custo do hash mesmo sem usuário, para o tempo de resposta não denunciar quais
e-mails têm conta.

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

## Mapa dos módulos

| Módulo | Responsabilidade |
| --- | --- |
| `lib/fontes/` | Catálogo jurídico, busca BM25 e auditoria de citações |
| `lib/curriculo.ts` | Grade de referência: disciplinas, períodos, áreas e temas |
| `lib/ia/cliente.ts` | Acesso ao modelo, streaming, saída estruturada, modo demonstração |
| `lib/ia/prompts.ts` | Persona do Professor e do Jurista, e a regra de fundamentação |
| `lib/ia/schemas.ts` | Formatos exigidos nas tarefas estruturadas |
| `lib/servicos/` | Regras de negócio: questões, documentos, roteiro, plano, desempenho |
| `lib/auth.ts` | Cadastro, login, sessão, perfil e matrículas |
| `lib/db.ts` | Conexão e schema SQLite |

`lib/curriculo.ts` é o elo entre as duas metades: cada disciplina declara as
`areas` que restringem a busca no catálogo jurídico e os `temas` que alimentam o
gerador de questões e o plano de estudos.

## Fronteira servidor/cliente

Módulos com acesso a banco ou ao modelo carregam `import "server-only"`. Um
componente de cliente que tente importá-los quebra o build — o que já aconteceu
uma vez neste projeto, com as constantes do gerador de questões, e é por isso que
elas moram em `lib/opcoes-questoes.ts`, fora do serviço.

## Verificação

- `npm run typecheck` — tipos.
- `npm run verificar:catalogo` — nenhuma fonte sem texto literal, URL oficial e
  data de conferência; nenhuma fonte inalcançável pela busca.
- `npm run verificar:fluxos` — 24 checagens num Chromium real, contra um banco
  descartável e **sem chave de API**, cobrindo cadastro, onboarding, os dois
  ambientes, upload de PDF (com e sem camada de texto) e proteção de rotas.
