import "server-only";

import { db } from "@/lib/db";
import { buscarFontes, buscarFontePorId } from "@/lib/fontes";
import { gerarEstruturado } from "@/lib/ia/cliente";
import { promptAnaliseDeDocumento } from "@/lib/ia/prompts";
import { AnaliseDeDocumentoSchema, type AnaliseDeDocumento } from "@/lib/ia/schemas";

/** Teto de texto enviado ao modelo por documento. */
const LIMITE_CARACTERES = 120_000;

export class ErroDeUpload extends Error {}

/**
 * Extrai o texto de um PDF ou DOCX.
 *
 * PDF sem camada de texto (digitalização pura) não é tratado no V1: em vez de
 * devolver uma análise a partir de página em branco, avisamos que o arquivo
 * precisa de OCR. Silenciar isso seria a forma mais fácil de a IA "analisar" um
 * documento que ela não leu.
 */
export async function extrairTexto(arquivo: File): Promise<{ texto: string; tipo: string }> {
  const nome = arquivo.name.toLowerCase();
  const buffer = Buffer.from(await arquivo.arrayBuffer());

  if (nome.endsWith(".pdf")) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const documento = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(documento, { mergePages: true });
    const texto = (Array.isArray(text) ? text.join("\n") : text).trim();
    if (texto.length < 40) {
      throw new ErroDeUpload(
        "Este PDF não tem camada de texto — provavelmente é um documento digitalizado. " +
          "Passe um OCR nele antes de enviar: sem texto extraível, qualquer análise seria chute.",
      );
    }
    return { texto, tipo: "pdf" };
  }

  if (nome.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer });
    const texto = value.trim();
    if (texto.length < 40) throw new ErroDeUpload("O arquivo .docx não contém texto legível.");
    return { texto, tipo: "docx" };
  }

  if (nome.endsWith(".txt") || nome.endsWith(".md")) {
    const texto = buffer.toString("utf-8").trim();
    if (texto.length < 40) throw new ErroDeUpload("O arquivo de texto está vazio.");
    return { texto, tipo: "txt" };
  }

  throw new ErroDeUpload("Formato não suportado. Envie PDF, DOCX, TXT ou MD.");
}

export function salvarDocumento(opcoes: {
  usuarioId: number;
  nomeArquivo: string;
  tipo: string;
  texto: string;
}): number {
  const resultado = db()
    .prepare(
      `INSERT INTO documentos (usuario_id, nome_arquivo, tipo, caracteres, texto)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      opcoes.usuarioId,
      opcoes.nomeArquivo,
      opcoes.tipo,
      opcoes.texto.length,
      opcoes.texto.slice(0, LIMITE_CARACTERES),
    );
  return Number(resultado.lastInsertRowid);
}

export async function analisarDocumento(
  id: number,
  usuarioId: number,
): Promise<AnaliseDeDocumento> {
  const documento = carregarDocumento(id, usuarioId);
  if (!documento) throw new ErroDeUpload("Documento não encontrado.");

  // O começo do documento concentra qualificação das partes, objeto e pedidos —
  // é o melhor trecho para descobrir de que áreas do Direito buscar fontes.
  const fontes = buscarFontes(documento.texto.slice(0, 4000), { limite: 8 });

  const analise = await gerarEstruturado({
    sistema: promptAnaliseDeDocumento(fontes),
    turnos: [
      {
        papel: "user",
        conteudo: `Analise o documento a seguir.\n\n<documento nome="${documento.nome_arquivo}">\n${documento.texto}\n</documento>`,
      },
    ],
    schema: AnaliseDeDocumentoSchema,
    nomeFerramenta: "entregar_analise",
    descricaoFerramenta: "Entrega a análise estruturada do documento processual.",
    maxTokens: 6144,
    temperatura: 0.2,
  });

  const limpa: AnaliseDeDocumento = {
    ...analise,
    fontes: analise.fontes.filter((fid) => Boolean(buscarFontePorId(fid))),
  };

  db()
    .prepare("UPDATE documentos SET analise_json = ? WHERE id = ? AND usuario_id = ?")
    .run(JSON.stringify(limpa), id, usuarioId);

  return limpa;
}

export interface DocumentoArmazenado {
  id: number;
  nome_arquivo: string;
  tipo: string;
  caracteres: number;
  texto: string;
  analise: AnaliseDeDocumento | null;
  criado_em: string;
}

export function carregarDocumento(id: number, usuarioId: number): DocumentoArmazenado | null {
  const linha = db()
    .prepare(
      "SELECT id, nome_arquivo, tipo, caracteres, texto, analise_json, criado_em FROM documentos WHERE id = ? AND usuario_id = ?",
    )
    .get(id, usuarioId) as
    | {
        id: number;
        nome_arquivo: string;
        tipo: string;
        caracteres: number;
        texto: string;
        analise_json: string | null;
        criado_em: string;
      }
    | undefined;

  if (!linha) return null;
  return {
    id: linha.id,
    nome_arquivo: linha.nome_arquivo,
    tipo: linha.tipo,
    caracteres: linha.caracteres,
    texto: linha.texto,
    analise: linha.analise_json ? (JSON.parse(linha.analise_json) as AnaliseDeDocumento) : null,
    criado_em: linha.criado_em,
  };
}

export function documentosDoUsuario(usuarioId: number, limite = 20) {
  return db()
    .prepare(
      `SELECT id, nome_arquivo, tipo, caracteres, criado_em,
              CASE WHEN analise_json IS NULL THEN 0 ELSE 1 END AS analisado
         FROM documentos WHERE usuario_id = ? ORDER BY id DESC LIMIT ?`,
    )
    .all(usuarioId, limite) as Array<{
    id: number;
    nome_arquivo: string;
    tipo: string;
    caracteres: number;
    criado_em: string;
    analisado: number;
  }>;
}
