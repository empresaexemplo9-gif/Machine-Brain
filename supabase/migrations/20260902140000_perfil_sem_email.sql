-- ---------------------------------------------------------------------------
-- Corrige o trigger de cadastro para contas sem e-mail
--
-- A primeira versão derivava o nome de `split_part(new.email, '@', 1)` quando o
-- cadastro não trazia "nome" no metadata. Em conta sem e-mail — telefone, ou um
-- provedor OAuth que não devolve endereço — `new.email` é NULL, a expressão
-- inteira vira NULL e o INSERT esbarra no NOT NULL de `perfis.nome` (23502).
--
-- Como o trigger é AFTER INSERT em auth.users, a exceção aborta a transação:
-- não é um perfil incompleto, é o CADASTRO INTEIRO que falha.
--
-- Hoje a aplicação só usa e-mail e senha, então o caminho não é alcançável.
-- Basta habilitar outro provedor no painel para passar a ser — e a falha
-- apareceria como "erro ao criar conta", sem nada apontando para cá.
--
-- Vem como migração nova, e não como edição da anterior, porque a primeira já
-- pode ter sido aplicada. `create or replace` a substitui sem tocar no trigger,
-- que continua apontando para a mesma função.
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
    -- Cada alternativa pode ser NULL; o '' final garante que a coluna NOT NULL
    -- sempre receba algo. Perfil sem nome o usuário corrige depois — cadastro
    -- que falha, não.
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'nome'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
