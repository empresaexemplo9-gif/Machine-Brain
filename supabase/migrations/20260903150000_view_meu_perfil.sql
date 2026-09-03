-- ---------------------------------------------------------------------------
-- View meu_perfil: o perfil com o plano JÁ RESOLVIDO.
--
-- Corrige um defeito real: a aplicação lia perfis.plano direto, e essa coluna
-- só muda quando alguém é marcado à mão. Uma assinatura paga e válida na tabela
-- `assinaturas` não mudava nada — quem pagasse continuaria vendo o plano
-- gratuito. O modo pago simplesmente não ligava.
--
-- Existe a função plano_efetivo() para isso, mas usá-la custaria uma consulta a
-- mais em toda página, já que o nome e o ambiente continuam vindo de `perfis`.
-- A view devolve tudo de uma vez.
--
-- security_invoker = true é o ponto que faz isso ser seguro: a view roda com as
-- permissões de QUEM CHAMA, então as políticas de RLS de perfis e de assinaturas
-- continuam valendo dentro dela. Sem essa opção a view rodaria como o dono e
-- passaria por cima do RLS — devolvendo o perfil dos outros.
-- ---------------------------------------------------------------------------

create view public.meu_perfil
with (security_invoker = true) as
  select
    p.id,
    p.nome,
    p.ambiente,
    case
      when p.plano = 'pro' then 'pro'
      when exists (
        select 1 from public.assinaturas a
         where a.usuario_id = p.id and a.expira_em > now()
      ) then 'pro'
      else 'gratuito'
    end as plano
  from public.perfis p;

grant select on public.meu_perfil to authenticated;
