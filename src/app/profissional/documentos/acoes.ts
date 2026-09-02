"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/auth";
import { ErroDeGeracao } from "@/lib/ia/cliente";
import { ErroDeUpload, analisarDocumento, extrairTexto, salvarDocumento } from "@/lib/servicos/documentos";

export interface EstadoUpload {
  erro?: string;
}

/** 12 MB: cabe um processo razoável sem transformar o servidor em depósito. */
const TAMANHO_MAXIMO = 12 * 1024 * 1024;

export async function enviarDocumentoAction(
  _anterior: EstadoUpload,
  dados: FormData,
): Promise<EstadoUpload> {
  const usuario = await exigirUsuario();
  const arquivo = dados.get("arquivo");

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { erro: "Selecione um arquivo." };
  }
  if (arquivo.size > TAMANHO_MAXIMO) {
    return { erro: "Arquivo acima de 12 MB. Envie apenas a parte relevante dos autos." };
  }

  let id: number;
  try {
    const { texto, tipo } = await extrairTexto(arquivo);
    id = salvarDocumento({
      usuarioId: usuario.id,
      nomeArquivo: arquivo.name,
      tipo,
      texto,
    });
  } catch (erro) {
    if (erro instanceof ErroDeUpload) return { erro: erro.message };
    return { erro: erro instanceof Error ? erro.message : "Não consegui ler o arquivo." };
  }

  revalidatePath("/profissional/documentos");
  redirect(`/profissional/documentos/${id}`);
}

export async function analisarDocumentoAction(
  documentoId: number,
): Promise<{ erro?: string }> {
  const usuario = await exigirUsuario();
  try {
    await analisarDocumento(documentoId, usuario.id);
  } catch (erro) {
    if (erro instanceof ErroDeGeracao || erro instanceof ErroDeUpload) {
      return { erro: erro.message };
    }
    return { erro: erro instanceof Error ? erro.message : "Não consegui analisar o documento." };
  }
  revalidatePath(`/profissional/documentos/${documentoId}`);
  return {};
}
