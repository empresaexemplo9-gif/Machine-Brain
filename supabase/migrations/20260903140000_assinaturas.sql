-- ---------------------------------------------------------------------------
-- Assinaturas pré-pagas
--
-- O aluno paga por PIX e ganha um período. Não há renovação automática: quando
-- expira, a conta volta ao plano gratuito e continua funcionando — o modo pago
-- some, o resto fica. É o que "pré-pago" significa, e evita a cobrança
-- recorrente que ninguém autorizou.
--
-- `referencia` é o identificador do pagamento no provedor (txid do PIX). Ela é
-- UNIQUE de propósito: é o que impede o mesmo pagamento de virar crédito duas
-- vezes se o webhook reenviar — e webhook reenvia, por desenho, sempre que não
-- recebe confirmação. Sem essa restrição, uma reentrega dobra o período pago.
--
-- Ninguém autenticado escreve aqui. Conceder período é ato de quem confirmou o
-- dinheiro: o webhook do provedor ou o administrador, os dois por service_role.
-- O usuário só lê as próprias.
-- ---------------------------------------------------------------------------

create table public.assinaturas (
  id             bigint generated always as identity primary key,
  usuario_id     uuid not null references auth.users (id) on delete cascade,
  valor_centavos integer not null check (valor_centavos > 0),
  dias           smallint not null check (dias > 0),
  inicia_em      timestamptz not null default now(),
  expira_em      timestamptz not null,
  /** txid do PIX, ou o identificador que o administrador registrou. */
  referencia     text not null unique,
  /** 'webhook:<provedor>' ou o e-mail de quem confirmou na mão. */
  confirmada_por text not null,
  observacao     text,
  criado_em      timestamptz not null default now(),

  constraint periodo_coerente check (expira_em > inicia_em)
);

create index assinaturas_por_usuario on public.assinaturas (usuario_id, expira_em desc);

alter table public.assinaturas enable row level security;

-- Só leitura, e só das próprias. Escrita nenhuma: quem concede período é quem
-- confirmou o pagamento, nunca a sessão do beneficiado.
create policy "assinaturas próprias" on public.assinaturas
  for select to authenticated
  using ((select auth.uid()) = usuario_id);

grant select on public.assinaturas to authenticated;

-- ---------------------------------------------------------------------------
-- Plano efetivo
--
-- Duas origens: uma assinatura ainda válida, ou perfis.plano marcado à mão
-- (que é como o dono da plataforma tem acesso permanente sem pagar a si mesmo).
--
-- security definer para conseguir ler assinaturas de dentro da função sem
-- depender das políticas de quem chama; search_path vazio para a função não
-- poder ser sequestrada por um schema no caminho de busca.
-- ---------------------------------------------------------------------------
-- Sem parâmetro de propósito. Uma versão que aceitasse um uuid deixaria
-- qualquer usuário perguntar o plano de qualquer outro — e, sendo security
-- definer, responderia. Aqui a pergunta é sempre "e o meu?".
create or replace function public.plano_efetivo()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then 'gratuito'
    when exists (
      select 1 from public.perfis
       where id = (select auth.uid()) and plano = 'pro'
    ) then 'pro'
    when exists (
      select 1 from public.assinaturas
       where usuario_id = (select auth.uid()) and expira_em > now()
    ) then 'pro'
    else 'gratuito'
  end;
$$;

revoke all on function public.plano_efetivo() from public;
grant execute on function public.plano_efetivo() to authenticated;
