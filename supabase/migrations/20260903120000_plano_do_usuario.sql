-- ---------------------------------------------------------------------------
-- Plano do usuário
--
-- Define quais modos de IA cada conta enxerga. O modo pago (Anthropic) só
-- aparece no plano 'pro'; o plano 'gratuito' vê apenas os provedores com nível
-- gratuito.
--
-- ATENÇÃO ao grant abaixo. Antes desta migração, `authenticated` tinha UPDATE
-- na tabela inteira e a política "perfil próprio" permite alterar a própria
-- linha. Se `plano` entrasse assim, qualquer usuário se promoveria a 'pro' com
-- uma requisição, usando a chave pública que vai no bundle do navegador — e
-- passaria a gastar a chave paga da plataforma.
--
-- A correção é grant por coluna: o usuário escreve o que é dele (nome,
-- ambiente) e não alcança `plano`. Quem concede plano é um papel privilegiado
-- (o gateway de pagamento, via service_role), nunca a sessão do próprio
-- usuário. RLS decide QUAIS linhas; grant de coluna decide QUAIS campos — são
-- controles diferentes, e aqui os dois são necessários.
-- ---------------------------------------------------------------------------

alter table public.perfis
  add column plano text not null default 'gratuito'
    check (plano in ('gratuito', 'pro'));

comment on column public.perfis.plano is
  'Plano da conta. Só um papel privilegiado escreve aqui — ver os grants abaixo.';

revoke update on public.perfis from authenticated;

grant update (nome, ambiente, atualizado_em) on public.perfis to authenticated;
