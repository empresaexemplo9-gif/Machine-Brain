import type { Metadata } from "next";
import Link from "next/link";
import { exigirUsuario, perfilDoEstudante } from "@/lib/auth";
import { disciplinaPorSlug } from "@/lib/curriculo";
import { Chat } from "@/components/Chat";
import { conversasDoUsuario, mensagensDaConversa, conversaPertenceAo } from "@/lib/servicos/conversas";
import { MODO_DEMONSTRACAO, modosDisponiveis } from "@/lib/ia/cliente";
import { AvisoDeDemonstracao } from "@/components/AvisoDeDemonstracao";

export const metadata: Metadata = { title: "Professor IA" };

const SUGESTOES_GERAIS = [
  "O que é direito natural?",
  "Qual a diferença entre prescrição e decadência?",
  "Me explique o controle de constitucionalidade",
  "Como funciona o habeas corpus?",
];

export default async function PaginaProfessor({
  searchParams,
}: {
  searchParams: Promise<{ disciplina?: string; pergunta?: string; conversa?: string }>;
}) {
  const usuario = await exigirUsuario();
  const perfil = (await perfilDoEstudante())!;
  const params = await searchParams;

  const disciplina = params.disciplina ? disciplinaPorSlug(params.disciplina) : undefined;
  const conversas = await conversasDoUsuario("estudante", 15);

  // Uma conversa só é reaberta depois de confirmar que ela é deste usuário.
  const conversaId = params.conversa ? Number(params.conversa) : null;
  const conversaValida =
    conversaId !== null && Number.isInteger(conversaId) && (await conversaPertenceAo(conversaId));
  const mensagens = conversaValida ? await mensagensDaConversa(conversaId!) : [];

  return (
    <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <aside className="space-y-4">
        <div>
          <h2 className="titulo-secao mb-2">Contexto</h2>
          <p className="cartao p-3! text-xs text-[var(--color-texto-suave)]">
            {disciplina ? (
              <>
                <span className="font-medium text-[var(--color-texto)]">
                  {disciplina.emoji} {disciplina.nome}
                </span>
                <br />
                As fontes são buscadas dentro das áreas desta disciplina.
              </>
            ) : (
              <>Conversa geral. Abra pela disciplina para focar a busca de fontes.</>
            )}
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="titulo-secao">Conversas</h2>
            <Link href="/estudante/professor" className="text-xs text-[var(--color-acento)] hover:underline">
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
                    href={`/estudante/professor?conversa=${c.id}${
                      c.disciplina_slug ? `&disciplina=${c.disciplina_slug}` : ""
                    }`}
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
          <h1 className="text-xl font-bold tracking-tight">
            👨‍🏫 Professor IA
            {disciplina && (
              <span className="text-[var(--color-texto-fraco)]"> · {disciplina.nome}</span>
            )}
          </h1>
        </header>

        {MODO_DEMONSTRACAO && <AvisoDeDemonstracao />}

        <Chat
          modos={modosDisponiveis(usuario.plano)}
          key={conversaValida ? `c${conversaId}` : `n${params.disciplina ?? "geral"}`}
          ambiente="estudante"
          disciplinaSlug={disciplina?.slug ?? null}
          disciplinaNome={disciplina?.nome ?? null}
          nivelInicial={perfil.nivel}
          conversaIdInicial={conversaValida ? conversaId : null}
          mensagensIniciais={mensagens.map((m) => ({
            papel: m.papel,
            conteudo: m.conteudo,
            auditoria: m.auditoria,
          }))}
          sugestoes={disciplina ? disciplina.temas.slice(0, 4).map((t) => `Me explique ${t}`) : SUGESTOES_GERAIS}
          perguntaAutomatica={params.pergunta}
        />
      </div>
    </div>
  );
}
