-- ---------------------------------------------------------------------------
-- Prova das políticas de RLS.
--
-- A pergunta que este arquivo responde é uma só: um usuário autenticado
-- consegue, de alguma forma, ler ou tocar a linha de outro? Cada bloco tenta
-- um caminho — ler, inserir em nome do outro, atualizar, apagar — e falha o
-- script inteiro se algum funcionar.
--
-- Rodar com: psql -v ON_ERROR_STOP=1 -f rls.sql
-- ---------------------------------------------------------------------------

\set ARTHUR '11111111-1111-1111-1111-111111111111'
\set BEATRIZ '22222222-2222-2222-2222-222222222222'

insert into auth.users (id, email, raw_user_meta_data) values
  (:'ARTHUR',  'arthur@exemplo.com',  '{"nome": "Arthur"}'::jsonb),
  (:'BEATRIZ', 'beatriz@exemplo.com', '{"nome": "Beatriz"}'::jsonb);

-- O trigger de cadastro precisa ter criado os dois perfis sozinho.
do $$
declare quantos integer;
begin
  select count(*) into quantos from public.perfis;
  if quantos <> 2 then
    raise exception 'trigger de cadastro não criou os perfis: esperado 2, veio %', quantos;
  end if;
  if not exists (select 1 from public.perfis where nome = 'Arthur') then
    raise exception 'trigger não aproveitou o nome vindo do metadata do cadastro';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Arthur cria os dados dele, autenticado.
-- ---------------------------------------------------------------------------
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111"}';

insert into public.perfis_estudante (usuario_id, periodo, faculdade, objetivo)
  values (auth.uid(), 2, 'UFG', 'Passar no Exame de Ordem');
insert into public.matriculas (usuario_id, disciplina_slug)
  values (auth.uid(), 'direito-constitucional-i');
insert into public.conversas (usuario_id, ambiente, titulo)
  values (auth.uid(), 'estudante', 'O que é habeas corpus?');
insert into public.mensagens (conversa_id, usuario_id, papel, conteudo)
  select id, auth.uid(), 'user', 'O que é habeas corpus?' from public.conversas limit 1;
insert into public.simulados (usuario_id, disciplina_slug, estilo, dificuldade, questoes, total, acertos, finalizado_em)
  values (auth.uid(), 'direito-constitucional-i', 'oab', 'media', '[]'::jsonb, 10, 8, now());
insert into public.documentos (usuario_id, nome_arquivo, tipo, texto)
  values (auth.uid(), 'peticao.pdf', 'pdf', 'EXCELENTÍSSIMO SENHOR DOUTOR JUIZ');
insert into public.roteiros (usuario_id, caso, roteiro)
  values (auth.uid(), 'Atraso na entrega de imóvel na planta', '{}'::jsonb);
insert into public.planos_estudo (usuario_id, conteudo)
  values (auth.uid(), '{}'::jsonb);

do $$
begin
  if (select count(*) from public.conversas) <> 1 then
    raise exception 'Arthur não enxerga a própria conversa';
  end if;
  if (select count(*) from public.perfis) <> 1 then
    raise exception 'perfis deveria mostrar só o do próprio usuário, veio %',
      (select count(*) from public.perfis);
  end if;
end
$$;
commit;

-- ---------------------------------------------------------------------------
-- Beatriz, autenticada, não pode ver nada de Arthur.
-- ---------------------------------------------------------------------------
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222"}';

do $$
declare
  tabela text;
  quantos integer;
begin
  foreach tabela in array array[
    'perfis_estudante', 'matriculas', 'conversas', 'mensagens',
    'simulados', 'documentos', 'roteiros', 'planos_estudo'
  ] loop
    execute format('select count(*) from public.%I', tabela) into quantos;
    if quantos <> 0 then
      raise exception 'VAZAMENTO: Beatriz enxerga % linha(s) de Arthur em %', quantos, tabela;
    end if;
  end loop;

  -- perfis tem a linha dela própria, criada pelo trigger, e só ela.
  if (select count(*) from public.perfis) <> 1 then
    raise exception 'VAZAMENTO: perfis expôs % linhas para Beatriz',
      (select count(*) from public.perfis);
  end if;
  if not exists (select 1 from public.perfis where nome = 'Beatriz') then
    raise exception 'Beatriz não enxerga o próprio perfil';
  end if;
end
$$;

-- Inserir em nome de outro precisa esbarrar no WITH CHECK.
do $$
begin
  begin
    insert into public.documentos (usuario_id, nome_arquivo, tipo, texto)
      values ('11111111-1111-1111-1111-111111111111', 'forjado.pdf', 'pdf', 'texto');
    raise exception 'VAZAMENTO: Beatriz inseriu documento em nome de Arthur';
  exception
    when insufficient_privilege then null;  -- esperado
  end;
end
$$;

-- Escrever mensagem dentro da conversa de outro também.
do $$
begin
  begin
    insert into public.mensagens (conversa_id, usuario_id, papel, conteudo)
      values (1, '22222222-2222-2222-2222-222222222222', 'user', 'invasão');
    raise exception 'VAZAMENTO: Beatriz escreveu na conversa de Arthur';
  exception
    when insufficient_privilege then null;  -- barrado pelo RLS de conversas
    when foreign_key_violation then null;   -- ou pela chave composta (id, dono)
  end;
end
$$;

-- Update e delete não devem alcançar linha nenhuma.
do $$
declare atingidas integer;
begin
  update public.documentos set nome_arquivo = 'alterado.pdf';
  get diagnostics atingidas = row_count;
  if atingidas <> 0 then
    raise exception 'VAZAMENTO: update de Beatriz alcançou % linha(s) de Arthur', atingidas;
  end if;

  delete from public.roteiros;
  get diagnostics atingidas = row_count;
  if atingidas <> 0 then
    raise exception 'VAZAMENTO: delete de Beatriz alcançou % linha(s) de Arthur', atingidas;
  end if;
end
$$;
commit;

-- ---------------------------------------------------------------------------
-- Os dados de Arthur seguem intactos.
-- ---------------------------------------------------------------------------
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111"}';
do $$
begin
  if (select count(*) from public.roteiros) <> 1 then
    raise exception 'o roteiro de Arthur sumiu depois do delete de Beatriz';
  end if;
  if (select nome_arquivo from public.documentos limit 1) <> 'peticao.pdf' then
    raise exception 'o documento de Arthur foi alterado por Beatriz';
  end if;
end
$$;
commit;

-- ---------------------------------------------------------------------------
-- Sem sessão (papel anon) não se lê nada.
-- ---------------------------------------------------------------------------
begin;
set local role anon;
do $$
begin
  begin
    perform 1 from public.documentos;
    raise exception 'VAZAMENTO: papel anon conseguiu ler documentos';
  exception
    when insufficient_privilege then null;  -- esperado
    when invalid_schema_name then null;     -- schema public revogado de anon
  end;
end
$$;
commit;

-- ---------------------------------------------------------------------------
-- Guarda de regressão: nenhuma tabela nova pode entrar sem RLS e sem política.
-- ---------------------------------------------------------------------------
do $$
declare frouxa text;
begin
  select string_agg(c.relname, ', ') into frouxa
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'
     and not c.relrowsecurity;
  if frouxa is not null then
    raise exception 'tabela(s) em public sem RLS habilitado: %', frouxa;
  end if;

  select string_agg(c.relname, ', ') into frouxa
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'
     and not exists (select 1 from pg_policy p where p.polrelid = c.oid);
  if frouxa is not null then
    raise exception 'tabela(s) com RLS mas sem nenhuma política (invisíveis): %', frouxa;
  end if;
end
$$;

select 'RLS verificado: nenhum vazamento entre usuários.' as resultado;
