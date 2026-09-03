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
-- Cadastro sem e-mail não pode derrubar o trigger.
--
-- Conta de telefone, ou provedor OAuth que não devolve endereço, chega aqui com
-- new.email NULL. Se o trigger deixar o nome virar NULL, o NOT NULL de
-- perfis.nome aborta a transação e o cadastro INTEIRO falha.
-- ---------------------------------------------------------------------------
do $$
begin
  insert into auth.users (id, email, raw_user_meta_data)
    values ('33333333-3333-3333-3333-333333333333', null, '{}'::jsonb);
exception when others then
  raise exception 'cadastro sem e-mail derrubou o trigger: % (SQLSTATE %)', sqlerrm, sqlstate;
end
$$;

do $$
begin
  if not exists (select 1 from public.perfis
                  where id = '33333333-3333-3333-3333-333333333333') then
    raise exception 'o perfil da conta sem e-mail não foi criado';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Escalada de plano: o usuário NÃO pode se promover a 'pro'.
--
-- Este é o caso que o RLS sozinho não pega. A política "perfil próprio"
-- autoriza Beatriz a atualizar a linha dela — e é isso que se quer, para nome e
-- ambiente. Quem barra a coluna `plano` é o grant por coluna. Sem ele, uma
-- requisição com a chave pública (que vai no bundle do navegador) daria acesso
-- ao modo pago de graça.
-- ---------------------------------------------------------------------------
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222"}';

do $$
begin
  begin
    update public.perfis set plano = 'pro'
     where id = '22222222-2222-2222-2222-222222222222';
    raise exception 'ESCALADA: Beatriz se promoveu ao plano pago sozinha';
  exception
    when insufficient_privilege then null;  -- resultado desejado
  end;
end
$$;

-- O que é dela, ela continua podendo mudar. Um grant apertado demais quebraria
-- o perfil e ninguém notaria até um usuário tentar trocar o próprio nome.
update public.perfis set nome = 'Beatriz Lima'
 where id = '22222222-2222-2222-2222-222222222222';

do $$
declare atual text;
begin
  select nome into atual from public.perfis
   where id = '22222222-2222-2222-2222-222222222222';
  if atual is distinct from 'Beatriz Lima' then
    raise exception 'o grant por coluna impediu o usuário de trocar o próprio nome: %', atual;
  end if;

  select plano into atual from public.perfis
   where id = '22222222-2222-2222-2222-222222222222';
  if atual is distinct from 'gratuito' then
    raise exception 'plano deveria ter continuado gratuito, veio %', atual;
  end if;
end
$$;
commit;

-- ---------------------------------------------------------------------------
-- Guarda: o papel `anon` não pode ter privilégio nenhum em public.
--
-- Lido de pg_class.relacl, e NÃO de information_schema.role_table_grants: essa
-- view só devolve os grants que o usuário conectado enxerga, e por isso já
-- respondeu "nenhum" num banco onde a ACL dizia anon=arwdDxtm. Auditar
-- privilégio pela view errada é pior do que não auditar — dá um verde falso.
-- ---------------------------------------------------------------------------
do $$
declare abertas text;
begin
  select string_agg(format('%s(%s)', c.relname, a.privilege_type), ', ')
    into abertas
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
   where n.nspname = 'public'
     and c.relkind = 'r'
     and a.grantee = 'anon'::regrole;
  if abertas is not null then
    raise exception 'anon tem privilégio em public (a chave pública vai no navegador): %', abertas;
  end if;
end
$$;

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
