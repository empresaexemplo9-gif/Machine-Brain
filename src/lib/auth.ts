import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";

const COOKIE = "mb_sessao";
const DURACAO_DIAS = 30;

export interface Usuario {
  id: number;
  email: string;
  nome: string;
  ambiente: "estudante" | "profissional";
}

export interface PerfilEstudante {
  usuario_id: number;
  periodo: number;
  faculdade: string;
  objetivo: string;
  nivel: string;
}

function segredo(): Uint8Array {
  const bruto = process.env.MB_SESSION_SECRET;
  if (!bruto || bruto.length < 16) {
    // Falhar aqui é melhor do que assinar sessões com um segredo previsível.
    throw new Error(
      "MB_SESSION_SECRET ausente ou curto demais. Defina-o no .env.local (veja .env.example).",
    );
  }
  return new TextEncoder().encode(bruto);
}

// ---------------------------------------------------------------------------
// Cadastro e login
// ---------------------------------------------------------------------------

export class ErroDeAutenticacao extends Error {}

export async function criarConta(entrada: {
  nome: string;
  email: string;
  senha: string;
}): Promise<Usuario> {
  const email = entrada.email.trim().toLowerCase();
  const conexao = db();

  const existente = conexao.prepare("SELECT id FROM usuarios WHERE email = ?").get(email);
  if (existente) throw new ErroDeAutenticacao("Já existe uma conta com esse e-mail.");

  const hash = await bcrypt.hash(entrada.senha, 10);
  const resultado = conexao
    .prepare("INSERT INTO usuarios (email, senha_hash, nome) VALUES (?, ?, ?)")
    .run(email, hash, entrada.nome.trim());

  return {
    id: Number(resultado.lastInsertRowid),
    email,
    nome: entrada.nome.trim(),
    ambiente: "estudante",
  };
}

export async function autenticar(email: string, senha: string): Promise<Usuario> {
  const registro = db()
    .prepare("SELECT id, email, nome, senha_hash, ambiente FROM usuarios WHERE email = ?")
    .get(email.trim().toLowerCase()) as
    | { id: number; email: string; nome: string; senha_hash: string; ambiente: string }
    | undefined;

  // Mensagem única para e-mail inexistente e senha errada: não entregamos a
  // um atacante a informação de quais e-mails têm conta.
  const generico = "E-mail ou senha incorretos.";
  if (!registro) {
    // Custo de hash mesmo sem usuário, para o tempo de resposta não denunciar.
    await bcrypt.compare(senha, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
    throw new ErroDeAutenticacao(generico);
  }

  const confere = await bcrypt.compare(senha, registro.senha_hash);
  if (!confere) throw new ErroDeAutenticacao(generico);

  return {
    id: registro.id,
    email: registro.email,
    nome: registro.nome,
    ambiente: registro.ambiente as Usuario["ambiente"],
  };
}

// ---------------------------------------------------------------------------
// Sessão
// ---------------------------------------------------------------------------

export async function criarSessao(usuarioId: number): Promise<void> {
  const token = await new SignJWT({ uid: usuarioId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_DIAS}d`)
    .sign(segredo());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_DIAS * 24 * 60 * 60,
  });
}

export async function encerrarSessao(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function usuarioAtual(): Promise<Usuario | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, segredo());
    const uid = Number(payload.uid);
    if (!Number.isInteger(uid)) return null;

    const registro = db()
      .prepare("SELECT id, email, nome, ambiente FROM usuarios WHERE id = ?")
      .get(uid) as Usuario | undefined;
    return registro ?? null;
  } catch {
    // Token expirado, adulterado ou assinado com outro segredo.
    return null;
  }
}

/** Para páginas que só existem logado. Redireciona quando não há sessão. */
export async function exigirUsuario(): Promise<Usuario> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  return usuario;
}

// ---------------------------------------------------------------------------
// Perfil do estudante
// ---------------------------------------------------------------------------

export function perfilDoEstudante(usuarioId: number): PerfilEstudante | null {
  const registro = db()
    .prepare(
      "SELECT usuario_id, periodo, faculdade, objetivo, nivel FROM perfis_estudante WHERE usuario_id = ?",
    )
    .get(usuarioId) as PerfilEstudante | undefined;
  return registro ?? null;
}

export function salvarPerfilDoEstudante(perfil: PerfilEstudante): void {
  db()
    .prepare(
      `INSERT INTO perfis_estudante (usuario_id, periodo, faculdade, objetivo, nivel, atualizado_em)
       VALUES (@usuario_id, @periodo, @faculdade, @objetivo, @nivel, datetime('now'))
       ON CONFLICT(usuario_id) DO UPDATE SET
         periodo = excluded.periodo,
         faculdade = excluded.faculdade,
         objetivo = excluded.objetivo,
         nivel = excluded.nivel,
         atualizado_em = datetime('now')`,
    )
    .run(perfil);
}

export function disciplinasMatriculadas(usuarioId: number): string[] {
  const linhas = db()
    .prepare("SELECT disciplina_slug FROM matriculas WHERE usuario_id = ? ORDER BY disciplina_slug")
    .all(usuarioId) as Array<{ disciplina_slug: string }>;
  return linhas.map((l) => l.disciplina_slug);
}

export function definirMatriculas(usuarioId: number, slugs: string[]): void {
  const conexao = db();
  const transacao = conexao.transaction((lista: string[]) => {
    conexao.prepare("DELETE FROM matriculas WHERE usuario_id = ?").run(usuarioId);
    const insere = conexao.prepare(
      "INSERT OR IGNORE INTO matriculas (usuario_id, disciplina_slug) VALUES (?, ?)",
    );
    for (const slug of lista) insere.run(usuarioId, slug);
  });
  transacao(slugs);
}
