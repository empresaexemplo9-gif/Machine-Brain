-- ---------------------------------------------------------------------------
-- Machine Brain — esquema inicial
--
-- Toda tabela deste esquema guarda dado de UM usuário e nada é público. Por
-- isso o desenho parte do RLS, não das tabelas: cada linha carrega o dono, o
-- RLS fica ligado em todas, e a política é sempre a mesma — você só enxerga o
-- que é seu. Não existe caminho de leitura anônima em lugar nenhum.
--
-- As políticas usam (select auth.uid()) em vez de auth.uid() direto: assim o
-- Postgres avalia a função uma vez por consulta (InitPlan) em vez de uma vez
-- por linha, o que muda muito em tabelas com histórico longo.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Perfil de identidade
--
-- auth.users é do Supabase Auth e guarda e-mail e senha. Aqui fica só o que é
-- do produto. A linha nasce por trigger no cadastro, para que nunca exista
-- usuário autenticado sem perfil.
-- ---------------------------------------------------------------------------
create table public.perfis (
  id            uuid primary key references auth.users (id) on delete cascade,
  nome          text not null default '',
  ambiente      text not null default 'estudante'
                check (ambiente in ('estudante', 'profissional')),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Perfil acadêmico
--
-- Tabela separada de propósito: a EXISTÊNCIA da linha é o sinal de que o aluno
-- concluiu o onboarding. Fundir com public.perfis obrigaria a inventar um
-- "período 0" para representar "ainda não respondeu".
-- ---------------------------------------------------------------------------
create table public.perfis_estudante (
  usuario_id    uuid primary key references auth.users (id) on delete cascade,
  periodo       smallint not null check (periodo between 1 and 10),
  faculdade     text not null default '',
  objetivo      text not null default '',
  nivel         text not null default 'estudante'
                check (nivel in ('leigo', 'estudante', 'advogado', 'especialista')),
  atualizado_em timestamptz not null default now()
);

-- Disciplinas ativas. Nascem da grade do período e são ajustáveis, porque cada
-- faculdade monta a grade do seu jeito.
create table public.matriculas (
  usuario_id      uuid not null references auth.users (id) on delete cascade,
  disciplina_slug text not null,
  criado_em       timestamptz not null default now(),
  primary key (usuario_id, disciplina_slug)
);

-- ---------------------------------------------------------------------------
-- Conversas do Professor IA e do Jurista IA
-- ---------------------------------------------------------------------------
create table public.conversas (
  id              bigint generated always as identity primary key,
  usuario_id      uuid not null references auth.users (id) on delete cascade,
  ambiente        text not null check (ambiente in ('estudante', 'profissional')),
  disciplina_slug text,
  titulo          text not null,
  criado_em       timestamptz not null default now(),
  -- Necessária para a chave composta de mensagens (ver abaixo).
  unique (id, usuario_id)
);
create index conversas_por_usuario on public.conversas (usuario_id, id desc);

create table public.mensagens (
  id             bigint generated always as identity primary key,
  conversa_id    bigint not null,
  -- O dono é repetido aqui de propósito. Sem isso, a política de RLS de
  -- mensagens precisaria de um subselect em conversas a cada linha lida. A
  -- chave estrangeira composta logo abaixo torna impossível uma mensagem
  -- apontar para conversa de outro dono, então a repetição não pode divergir.
  usuario_id     uuid not null references auth.users (id) on delete cascade,
  papel          text not null check (papel in ('user', 'assistant')),
  conteudo       text not null,
  nivel          text,
  -- Resultado de auditarCitacoes() no momento da resposta, guardado para que o
  -- selo de verificação continue correto quando a conversa for reaberta.
  auditoria      jsonb,
  criado_em      timestamptz not null default now(),
  foreign key (conversa_id, usuario_id)
    references public.conversas (id, usuario_id) on delete cascade
);
create index mensagens_por_conversa on public.mensagens (conversa_id, id);

-- ---------------------------------------------------------------------------
-- Simulados
-- ---------------------------------------------------------------------------
create table public.simulados (
  id              bigint generated always as identity primary key,
  usuario_id      uuid not null references auth.users (id) on delete cascade,
  disciplina_slug text not null,
  estilo          text not null,
  dificuldade     text not null,
  tema            text not null default '',
  questoes        jsonb not null,
  respostas       jsonb,
  acertos         integer,
  total           integer not null,
  finalizado_em   timestamptz,
  criado_em       timestamptz not null default now()
);
create index simulados_por_usuario on public.simulados (usuario_id, id desc);
-- O painel agrega acertos por disciplina apenas dos simulados finalizados.
create index simulados_finalizados on public.simulados (usuario_id, disciplina_slug)
  where finalizado_em is not null;

-- ---------------------------------------------------------------------------
-- Documentos enviados pelo profissional
-- ---------------------------------------------------------------------------
create table public.documentos (
  id           bigint generated always as identity primary key,
  usuario_id   uuid not null references auth.users (id) on delete cascade,
  nome_arquivo text not null,
  tipo         text not null,
  caracteres   integer not null default 0,
  texto        text not null,
  analise      jsonb,
  criado_em    timestamptz not null default now()
);
create index documentos_por_usuario on public.documentos (usuario_id, id desc);

create table public.roteiros (
  id         bigint generated always as identity primary key,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  caso       text not null,
  roteiro    jsonb not null,
  criado_em  timestamptz not null default now()
);
create index roteiros_por_usuario on public.roteiros (usuario_id, id desc);

create table public.planos_estudo (
  id         bigint generated always as identity primary key,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  conteudo   jsonb not null,
  criado_em  timestamptz not null default now()
);
create index planos_por_usuario on public.planos_estudo (usuario_id, id desc);

-- ---------------------------------------------------------------------------
-- Criação automática do perfil no cadastro
--
-- security definer porque a função escreve em public.perfis por conta de um
-- usuário que ainda não tem sessão. search_path vazio é obrigatório aqui: sem
-- ele, um schema malicioso no caminho poderia sequestrar a resolução de nomes
-- dentro de uma função que roda com os privilégios do dono.
-- ---------------------------------------------------------------------------
create or replace function public.criar_perfil_do_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_do_novo_usuario();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Ligado em todas as tabelas. Sem política que case, o Postgres nega — então o
-- padrão aqui é "invisível", e cada política abaixo abre exatamente uma fresta:
-- as linhas do próprio usuário autenticado.
-- ---------------------------------------------------------------------------
alter table public.perfis            enable row level security;
alter table public.perfis_estudante  enable row level security;
alter table public.matriculas        enable row level security;
alter table public.conversas         enable row level security;
alter table public.mensagens         enable row level security;
alter table public.simulados         enable row level security;
alter table public.documentos        enable row level security;
alter table public.roteiros          enable row level security;
alter table public.planos_estudo     enable row level security;

create policy "perfil próprio" on public.perfis
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "perfil de estudante próprio" on public.perfis_estudante
  for all to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

create policy "matrículas próprias" on public.matriculas
  for all to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

create policy "conversas próprias" on public.conversas
  for all to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

create policy "mensagens próprias" on public.mensagens
  for all to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

create policy "simulados próprios" on public.simulados
  for all to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

create policy "documentos próprios" on public.documentos
  for all to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

create policy "roteiros próprios" on public.roteiros
  for all to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

create policy "planos próprios" on public.planos_estudo
  for all to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

-- ---------------------------------------------------------------------------
-- Privilégios
--
-- Só quem está autenticado toca nestas tabelas. O papel anon fica de fora de
-- propósito: não há nada aqui que faça sentido ler sem sessão, e conceder por
-- descuido é como a maioria dos vazamentos em Supabase acontece.
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.perfis,
  public.perfis_estudante,
  public.matriculas,
  public.conversas,
  public.mensagens,
  public.simulados,
  public.documentos,
  public.roteiros,
  public.planos_estudo
to authenticated;

revoke all on schema public from anon;
