import type { Metadata } from "next";
import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { Chat } from "@/components/Chat";
import { MODO_DEMONSTRACAO, modosDisponiveis } from "@/lib/ia/cliente";
import { AvisoDeDemonstracao } from "@/components/AvisoDeDemonstracao";
import { carregarDocumento } from "@/lib/servicos/documentos";
import {
  conversaPertenceAo,
  conversasDoUsuario,
  mensagensDaConversa,
} from "@/lib/servicos/conversas";

export const metadata: Metadata = { title: "Jurista IA" };

const SUGESTOES = [
  "Quais os requisitos da petição inicial?",
  "Meu cliente foi negativado indevidamente. Que teses eu tenho?",
  "Monte a estrutura de uma petição de indenização por dano moral",
  "Quando cabe tutela de urgência?",
];

export default async function PaginaJurista({
  searchParams,
}: {
  searchParams: Promise<{ conversa?: string; documento?: string }>;
}) {
  const usuario = await exigirUsuario();
  const params = await searchParams;

  const conversaId = params.conversa ? Number(params.conversa) : null;
  const conversaValida =
    conversaId !== null && Number.isInteger(conversaId) && (await conversaPertenceAo(conversaId));
  const mensagens = conversaValida ? await mensagensDaConversa(conversaId!) : [];

  const documentoId = params.documento ? Number(params.documento) : null;
  const documento =
    documentoId !== null && Number.isInteger(documentoId)
      ? await carregarDocumento(documentoId)
      : null;

  const conversas = await conversasDoUsuario("profissional", 15);

  return (
    <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <aside className="space-y-4">
        {documento && (
          <div>
            <h2 className="titulo-secao mb-2">Documento anexado</h2>
            <div className="cartao p-3!">
              <p className="truncate text-xs font-medium">📄 {documento.nome_arquivo}</p>
              <p className="mt-1 text-xs text-[var(--color-texto-fraco)]">
                O Jurista IA responde com o texto deste documento à vista.
              </p>
              <Link
                href={`/profissional/documentos/${documento.id}`}
                className="mt-2 inline-block text-xs text-[var(--color-acento)] hover:underline"
              >
                Ver análise
              </Link>
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="titulo-secao">Conversas</h2>
            <Link href="/profissional/jurista" className="text-xs text-[var(--color-acento)] hover:underline">
              Nova
            </Link>
          </div>
          {conversas.length === 0 ? (
            <p className="text-xs text-[var(--color-texto-fraco)]">Nenhuma conversa ainda.</p>
          ) : (
            <ul className="space-y-1.5">
              {conversas.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/profissional/jurista?conversa=${c.id}`}
                    className={`block rounded-lg border px-3 py-2 text-xs transition-colors ${
                      c.id === conversaId
                        ? "border-[var(--color-acento)] bg-[var(--color-acento)]/10 text-[var(--color-texto)]"
                        : "border-transparent text-[var(--color-texto-suave)] hover:border-[var(--color-borda)]"
                    }`}
                  >
                    <span className="line-clamp-2">{c.titulo}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <div>
        <header className="mb-5">
          <h1 className="text-xl font-bold tracking-tight">⚖️ Jurista IA</h1>
          <p className="mt-1 text-xs text-[var(--color-texto-fraco)]">
            Assistente, não advogado: as minutas saem para revisão e a estratégia é sua.
          </p>
        </header>

        {MODO_DEMONSTRACAO && <AvisoDeDemonstracao />}

        <Chat
          modos={modosDisponiveis(usuario.plano)}
          key={conversaValida ? `c${conversaId}` : `n${documentoId ?? "geral"}`}
          ambiente="profissional"
          documentoId={documento?.id ?? null}
          conversaIdInicial={conversaValida ? conversaId : null}
          mensagensIniciais={mensagens.map((m) => ({
            papel: m.papel,
            conteudo: m.conteudo,
            auditoria: m.auditoria,
          }))}
          sugestoes={
            documento
              ? [
                  "Analise este processo e me explique o que está acontecendo",
                  "Quais são os pontos frágeis deste documento?",
                  "Que prazos eu preciso conferir aqui?",
                ]
              : SUGESTOES
          }
        />
      </div>
    </div>
  );
}
