-- ---------------------------------------------------------------------------
-- Reprodução local do que o Supabase provê pronto.
--
-- Não faz parte do produto: existe só para que a migração e as políticas de
-- RLS possam ser exercitadas contra um Postgres de verdade nesta máquina, sem
-- depender de um projeto Supabase no ar. São os mesmos papéis, a mesma tabela
-- auth.users e a mesma definição de auth.uid() que a plataforma cria.
-- ---------------------------------------------------------------------------

create schema if not exists auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

create table if not exists auth.users (
  id                   uuid primary key default gen_random_uuid(),
  email                text unique,
  raw_user_meta_data   jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now()
);

-- Definição usada pelo Supabase: o id do usuário sai da claim "sub" do JWT,
-- que o PostgREST publica em request.jwt.claims a cada requisição.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

grant usage on schema auth to authenticated, anon, service_role;
grant select on auth.users to authenticated, service_role;
