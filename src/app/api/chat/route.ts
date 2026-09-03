import { NextResponse } from "next/server";
import { z } from "zod";
import { disciplinaPorSlug, ehNivelValido } from "@/lib/curriculo";
import { auditarCitacoes, buscarFontes, type Fonte } from "@/lib/fontes";
import { MODO_DEMONSTRACAO, responderEmFluxo } from "@/lib/ia/cliente";
import { IDS_MODOS } from "@/lib/ia/modos";
import { promptDoJurista, promptDoProfessor } from "@/lib/ia/prompts";
import { perfilDoEstudante, usuarioAtual } from "@/lib/auth";
import { carregarDocumento } from "@/lib/servicos/documentos";
import {
  conversaPertenceAo,
  criarConversa,
  historicoParaModelo,
  registrarMensagem,
} from "@/lib/servicos/conversas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Entrada = z.object({
  mensagem: z.string().min(1).max(8000),
  conversaId: z.number().int().positive().nullable().optional(),
  ambiente: z.enum(["estudante", "profissional"]),
  disciplinaSlug: z.string().nullable().optional(),
  documentoId: z.number().int().positive().nullable().optional(),
  nivel: z.string().optional(),
  /** true quando o usuário apertou "ainda não entendi". */
  reexplicar: z.boolean().optional(),
  /** Modo de IA escolhido. Ausente ou indisponível: usa o primeiro com chave. */
  modo: z.enum(IDS_MODOS).optional(),
});

/**
 * Chat do Professor IA e do Jurista IA.
 *
 * Responde em NDJSON: uma linha por evento. O texto vai chegando em eventos
 * `texto` e, quando o modelo termina, um único evento `fim` carrega as fontes
 * usadas e o resultado da auditoria de citações. A auditoria só pode rodar
 * sobre a resposta inteira, então ela é necessariamente o último evento — a
 * interface mostra o selo de verificação apenas quando ele chega.
 */
export async function POST(requisicao: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Sessão expirada. Entre novamente." }, { status: 401 });
  }

  const corpo = Entrada.safeParse(await requisicao.json());
  if (!corpo.success) {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }
  const entrada = corpo.data;

  // Conversa: ou é uma existente que pertence a este usuário, ou é nova. O RLS
  // já barraria a conversa alheia; esta checagem existe para devolver 404 em vez
  // de uma conversa vazia.
  let conversaId = entrada.conversaId ?? null;
  if (conversaId !== null && !(await conversaPertenceAo(conversaId))) {
    return NextResponse.json({ erro: "Conversa não encontrada." }, { status: 404 });
  }
  if (conversaId === null) {
    conversaId = await criarConversa({
      usuarioId: usuario.id,
      ambiente: entrada.ambiente,
      disciplinaSlug: entrada.disciplinaSlug ?? null,
      titulo: entrada.mensagem,
    });
  }

  const disciplina = entrada.disciplinaSlug
    ? disciplinaPorSlug(entrada.disciplinaSlug)
    : undefined;

  // Recuperação: a pergunta, ampliada pelo contexto da disciplina, para que
  // "e o inciso seguinte?" ainda alcance as fontes certas.
  const consulta = [entrada.mensagem, disciplina?.nome, disciplina?.temas.join(" ")]
    .filter(Boolean)
    .join(" ");
  const fontes: Fonte[] = buscarFontes(consulta, {
    limite: 6,
    areas: disciplina?.areas,
  });

  // Sem nada na área da disciplina, tentamos o catálogo inteiro antes de
  // desistir: melhor uma fonte correlata do que nenhuma.
  const fontesFinais =
    fontes.length > 0 ? fontes : buscarFontes(entrada.mensagem, { limite: 6 });

  let sistema: string;
  if (entrada.ambiente === "estudante") {
    const perfil = await perfilDoEstudante();
    const nivelBruto = entrada.nivel ?? perfil?.nivel ?? "estudante";
    sistema = promptDoProfessor({
      nomeAluno: usuario.nome,
      periodo: perfil?.periodo ?? 1,
      nivel: ehNivelValido(nivelBruto) ? nivelBruto : "estudante",
      disciplina,
      fontes: fontesFinais,
      reexplicar: entrada.reexplicar ?? false,
    });
  } else {
    const documento = entrada.documentoId
      ? await carregarDocumento(entrada.documentoId)
      : null;
    sistema = promptDoJurista({
      nomeUsuario: usuario.nome,
      fontes: fontesFinais,
      documento: documento
        ? { nome: documento.nome_arquivo, texto: documento.texto }
        : undefined,
    });
  }

  const historico = await historicoParaModelo(conversaId);
  await registrarMensagem({
    conversaId,
    usuarioId: usuario.id,
    papel: "user",
    conteudo: entrada.mensagem,
    nivel: entrada.nivel ?? null,
  });

  const turnos = [...historico, { papel: "user" as const, conteudo: entrada.mensagem }];
  const codificador = new TextEncoder();
  const idDaConversa = conversaId;

  const fluxo = new ReadableStream<Uint8Array>({
    async start(controlador) {
      const enviar = (evento: unknown) =>
        controlador.enqueue(codificador.encode(`${JSON.stringify(evento)}\n`));

      let completa = "";
      try {
        enviar({ tipo: "inicio", conversaId: idDaConversa });

        for await (const pedaco of responderEmFluxo({
          sistema,
          turnos,
          maxTokens: 2048,
          modo: entrada.modo,
          // O plano vem da sessão, nunca do corpo da requisição: é ele que
          // decide se o modo pedido pode ser entregue.
          plano: usuario.plano,
        })) {
          completa += pedaco;
          enviar({ tipo: "texto", valor: pedaco });
        }

        const auditoria = auditarCitacoes(completa, fontesFinais);
        await registrarMensagem({
          conversaId: idDaConversa,
          usuarioId: usuario.id,
          papel: "assistant",
          conteudo: completa,
          nivel: entrada.nivel ?? null,
          auditoria,
        });

        enviar({
          tipo: "fim",
          conversaId: idDaConversa,
          fontes: fontesFinais,
          auditoria,
          modoDemonstracao: MODO_DEMONSTRACAO,
        });
      } catch (erro) {
        const mensagem =
          erro instanceof Error ? erro.message : "Falha inesperada ao consultar o modelo.";
        // O que já foi gerado não se perde: fica registrado com a marca do erro.
        if (completa) {
          await registrarMensagem({
            conversaId: idDaConversa,
            usuarioId: usuario.id,
            papel: "assistant",
            conteudo: `${completa}\n\n_(resposta interrompida: ${mensagem})_`,
            auditoria: auditarCitacoes(completa, fontesFinais),
          });
        }
        enviar({ tipo: "erro", mensagem });
      } finally {
        controlador.close();
      }
    },
  });

  return new Response(fluxo, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
