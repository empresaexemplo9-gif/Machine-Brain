import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

/**
 * Conexão única com o SQLite.
 *
 * SQLite é escolha deliberada para o V1: o produto inteiro cabe em um arquivo,
 * sobe sem infraestrutura e permite iterar no modelo de dados sem cerimônia. A
 * migração para Postgres está prevista no roadmap para quando entrar o plano
 * Escritório (múltiplos usuários por conta, acesso concorrente pesado).
 */

const CAMINHO = process.env.MB_DATABASE_PATH ?? "./data/machine-brain.db";

let instancia: Database.Database | null = null;

function migrar(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      email        TEXT NOT NULL UNIQUE,
      senha_hash   TEXT NOT NULL,
      nome         TEXT NOT NULL,
      ambiente     TEXT NOT NULL DEFAULT 'estudante',
      criado_em    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Onboarding: o que o aluno informa e que molda a universidade virtual.
    CREATE TABLE IF NOT EXISTS perfis_estudante (
      usuario_id   INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
      periodo      INTEGER NOT NULL,
      faculdade    TEXT NOT NULL DEFAULT '',
      objetivo     TEXT NOT NULL DEFAULT '',
      nivel        TEXT NOT NULL DEFAULT 'estudante',
      atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Disciplinas ativas do aluno. Nascem da grade do período e podem ser
    -- ajustadas, porque cada faculdade monta a grade do seu jeito.
    CREATE TABLE IF NOT EXISTS matriculas (
      usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      disciplina_slug TEXT NOT NULL,
      criado_em       TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (usuario_id, disciplina_slug)
    );

    CREATE TABLE IF NOT EXISTS conversas (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      ambiente        TEXT NOT NULL,
      disciplina_slug TEXT,
      titulo          TEXT NOT NULL,
      criado_em       TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_conversas_usuario ON conversas(usuario_id, criado_em DESC);

    CREATE TABLE IF NOT EXISTS mensagens (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      conversa_id    INTEGER NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
      papel          TEXT NOT NULL,
      conteudo       TEXT NOT NULL,
      nivel          TEXT,
      -- Resultado de auditarCitacoes() no momento da resposta. Guardado para
      -- que o selo de verificação continue correto ao reabrir a conversa.
      auditoria_json TEXT,
      criado_em      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_mensagens_conversa ON mensagens(conversa_id, id);

    CREATE TABLE IF NOT EXISTS simulados (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      disciplina_slug TEXT NOT NULL,
      estilo          TEXT NOT NULL,
      dificuldade     TEXT NOT NULL,
      tema            TEXT NOT NULL DEFAULT '',
      questoes_json   TEXT NOT NULL,
      respostas_json  TEXT,
      acertos         INTEGER,
      total           INTEGER NOT NULL,
      finalizado_em   TEXT,
      criado_em       TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_simulados_usuario ON simulados(usuario_id, criado_em DESC);

    CREATE TABLE IF NOT EXISTS documentos (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      nome_arquivo  TEXT NOT NULL,
      tipo          TEXT NOT NULL,
      caracteres    INTEGER NOT NULL DEFAULT 0,
      texto         TEXT NOT NULL,
      analise_json  TEXT,
      criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_documentos_usuario ON documentos(usuario_id, criado_em DESC);

    CREATE TABLE IF NOT EXISTS roteiros (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      caso           TEXT NOT NULL,
      etapas_json    TEXT NOT NULL,
      criado_em      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_roteiros_usuario ON roteiros(usuario_id, criado_em DESC);

    CREATE TABLE IF NOT EXISTS planos_estudo (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      conteudo_json TEXT NOT NULL,
      criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_planos_usuario ON planos_estudo(usuario_id, criado_em DESC);
  `);
}

export function db(): Database.Database {
  if (instancia) return instancia;

  const dir = path.dirname(CAMINHO);
  if (dir && dir !== "." && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  instancia = new Database(CAMINHO);
  migrar(instancia);
  return instancia;
}
