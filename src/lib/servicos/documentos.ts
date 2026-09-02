import "server-only";

import { supabaseServidor } from "@/lib/supabase/servidor";
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

export async function salvarDocumento(opcoes: {
  usuarioId: string;
  nomeArquivo: string;
  tipo: string;
  texto: string;
}): Promise<number> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase
    .from("documentos")
    .insert({
      usuario_id: opcoes.usuarioId,
      nome_arquivo: opcoes.nomeArquivo,
      tipo: opcoes.tipo,
      caracteres: opcoes.texto.length,
      texto: opcoes.texto.slice(0, LIMITE_CARACTERES),
    })
    .select("id")
    .single();

  if (error || !data) throw new ErroDeUpload(`Não consegui salvar o documento: ${error?.message}`);
  return data.id as number;
}

export async function analisarDocumento(id: number): Promise<AnaliseDeDocumento> {
  const documento = await carregarDocumento(id);
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

  const supabase = await supabaseServidor();
  const { error } = await supabase.from("documentos").update({ analise: limpa }).eq("id", id);
  if (error) throw new ErroDeUpload(`Não consegui salvar a análise: ${error.message}`);

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

export async function carregarDocumento(id: number): Promise<DocumentoArmazenado | null> {
  const supabase = await supabaseServidor();
  const { data } = await supabase
    .from("documentos")
    .select("id, nome_arquivo, tipo, caracteres, texto, analise, criado_em")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id as number,
    nome_arquivo: data.nome_arquivo as string,
    tipo: data.tipo as string,
    caracteres: data.caracteres as number,
    texto: data.texto as string,
    analise: (data.analise as AnaliseDeDocumento | null) ?? null,
    criado_em: data.criado_em as string,
  };
}

export async function documentosDoUsuario(limite = 20) {
  const supabase = await supabaseServidor();
  const { data } = await supabase
    .from("documentos")
    .select("id, nome_arquivo, tipo, caracteres, criado_em, analise")
    .order("id", { ascending: false })
    .limit(limite);

  return (data ?? []).map((l) => ({
    id: l.id as number,
    nome_arquivo: l.nome_arquivo as string,
    tipo: l.tipo as string,
    caracteres: l.caracteres as number,
    criado_em: l.criado_em as string,
    analisado: l.analise !== null,
  }));
}
