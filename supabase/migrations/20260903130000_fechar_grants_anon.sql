-- ---------------------------------------------------------------------------
-- Retira do papel `anon` os privilégios de tabela.
--
-- A migração inicial tinha `revoke all on schema public from anon`, e eu tratei
-- isso como suficiente. Não é, por dois motivos que só aparecem no projeto
-- real: o Supabase aplica ALTER DEFAULT PRIVILEGES concedendo a anon e a
-- authenticated em toda tabela nova de public, e volta a conceder USAGE no
-- schema. O resultado, conferido em produção via pg_class.relacl:
--
--     anon=arwdDxtm/postgres   -- INSERT, SELECT, UPDATE, DELETE
--
-- Nada vazou: o RLS exige auth.uid() = dono, e para anon auth.uid() é NULL, de
-- modo que toda consulta casa com zero linhas. Mas a defesa ficou inteira numa
-- camada só — bastaria uma política nova escrita com `using (true)` para o
-- banco abrir para qualquer um com a chave pública.
--
-- Uma lição de método fica registrada: information_schema.role_table_grants
-- mostra apenas os grants que o usuário conectado pode enxergar, e por isso
-- devolveu "nenhum" enquanto a ACL dizia o contrário. Para auditar privilégio,
-- vale pg_class.relacl e has_table_privilege — não o information_schema.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
revoke usage on schema public from anon;

-- E que as tabelas futuras já nasçam fechadas para anon.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;
