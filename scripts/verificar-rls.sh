#!/usr/bin/env bash
#
# Prova as políticas de RLS contra um Postgres de verdade.
#
# Sobe um cluster descartável, recria localmente o que o Supabase provê pronto
# (schema auth, papéis, auth.uid()), aplica as migrações na ordem e roda o
# arquivo de asserções. Falha o script se qualquer usuário conseguir alcançar
# a linha de outro.
#
#   npm run verificar:rls
#
set -euo pipefail

# Sem PGBIN definido, pega a maior versão instalada — o caminho muda entre
# distribuições e entre imagens de runner, e fixar uma versão quebraria o CI a
# cada atualização da imagem.
BIN="${PGBIN:-}"
if [ -z "$BIN" ]; then
  for candidato in $(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V -r); do
    if [ -x "$candidato/initdb" ]; then BIN="$candidato"; break; fi
  done
fi
if [ -z "$BIN" ] && command -v initdb >/dev/null 2>&1; then
  BIN="$(dirname "$(command -v initdb)")"
fi

if [ -z "$BIN" ] || [ ! -x "$BIN/initdb" ]; then
  echo "Servidor Postgres não encontrado." >&2
  echo "Instale o postgresql (ex.: apt-get install postgresql) ou aponte PGBIN" >&2
  echo "para o diretório de binários que contém o initdb." >&2
  exit 1
fi
echo "Usando Postgres de $BIN"

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TRABALHO="$(mktemp -d)"
DADOS="$TRABALHO/dados"
SOCKET="$TRABALHO/socket"
mkdir -p "$SOCKET"

# O Postgres se recusa a rodar como root. Num runner de CI o usuário já é comum
# e não há o que fazer; em container como root, delegamos a um usuário sem
# privilégio (o do próprio pacote, quando existe).
COMO_SERVIDOR=()
if [ "$(id -u)" -eq 0 ]; then
  USUARIO_PG="${PGRUNAS:-postgres}"
  if ! id "$USUARIO_PG" >/dev/null 2>&1; then
    echo "Rodando como root e o usuário '$USUARIO_PG' não existe." >&2
    echo "Rode como usuário comum ou defina PGRUNAS com um usuário sem privilégio." >&2
    exit 1
  fi
  chown -R "$USUARIO_PG" "$TRABALHO"
  COMO_SERVIDOR=(su "$USUARIO_PG" -s /bin/bash -c)
fi

# Executa um comando como o dono do servidor, seja ele o usuário atual ou o
# delegado. Quando delegado, o comando precisa ir como string única para o su.
servidor() {
  if [ ${#COMO_SERVIDOR[@]} -eq 0 ]; then
    "$@"
  else
    local montado=""
    local parte
    for parte in "$@"; do montado+="$(printf '%q' "$parte") "; done
    "${COMO_SERVIDOR[@]}" "$montado"
  fi
}

limpar() {
  servidor "$BIN/pg_ctl" -D "$DADOS" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$TRABALHO"
}
trap limpar EXIT

echo "Subindo Postgres descartável em $TRABALHO"
servidor "$BIN/initdb" -D "$DADOS" -U postgres --auth=trust >"$TRABALHO/initdb.log" 2>&1
servidor "$BIN/pg_ctl" -D "$DADOS" -o "-k $SOCKET -h ''" -l "$TRABALHO/postgres.log" -w start >/dev/null

export PGHOST="$SOCKET"
export PGUSER=postgres
export PGDATABASE=postgres

executar() {
  psql -v ON_ERROR_STOP=1 --quiet --no-psqlrc -f "$1"
}

echo "Recriando o schema auth do Supabase"
executar "$RAIZ/supabase/testes/stub-auth.sql" >/dev/null

echo "Aplicando as migrações"
for migracao in "$RAIZ"/supabase/migrations/*.sql; do
  echo "  · $(basename "$migracao")"
  executar "$migracao" >/dev/null
done

echo "Exercitando as políticas"
executar "$RAIZ/supabase/testes/rls.sql"
