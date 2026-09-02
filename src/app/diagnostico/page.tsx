import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { diagnosticar, type Estado } from "@/lib/supabase/diagnostico";
import { estadoDosModos } from "@/lib/ia/provedores";
import { descreverModo } from "@/lib/ia/modos";

/**
 * Página de diagnóstico da configuração do deploy.
 *
 * Existe porque "Supabase não configurado" tem cinco causas possíveis e o mesmo
 * sintoma. Aqui a aplicação responde de dentro do próprio processo que está no
 * ar: o que o build recebeu, se o projeto responde, se a migração foi aplicada
 * e se o acesso anônimo está negado.
 *
 * Não exige sessão — teria que exigir o que ainda não funciona. Em compensação,
 * nada aqui é segredo: a URL do projeto e o prefixo da chave publicável já vão
 * no bundle do navegador, e chave nenhuma é impressa por inteiro.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Diagnóstico",
  robots: { index: false, follow: false },
};

const CORES: Record<Estado, { marca: string; borda: string; fundo: string }> = {
  ok: {
    marca: "text-[var(--color-verde)]",
    borda: "border-[var(--color-verde)]/40",
    fundo: "bg-[var(--color-verde)]/10",
  },
  aviso: {
    marca: "text-[var(--color-ambar)]",
    borda: "border-[var(--color-ambar)]/40",
    fundo: "bg-[var(--color-ambar)]/10",
  },
  falha: {
    marca: "text-[var(--color-vermelho)]",
    borda: "border-[var(--color-vermelho)]/40",
    fundo: "bg-[var(--color-vermelho)]/10",
  },
};

const SIMBOLO: Record<Estado, string> = { ok: "✓", aviso: "!", falha: "✗" };

export default async function PaginaDeDiagnostico() {
  const { checagens, estado, resumo, passos } = await diagnosticar();
  const cor = CORES[estado];
  const modos = estadoDosModos();
  const ligados = modos.filter((m) => m.disponivel).length;

  return (
    <main className="pagina space-y-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <Logo altura={28} />
        <Link href="/" className="text-xs text-[var(--color-texto-suave)] hover:underline">
          voltar
        </Link>
      </header>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Diagnóstico da configuração</h1>
        <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
          O que este deploy recebeu, verificado agora, de dentro dele.
        </p>
      </div>

      <div className={`rounded-xl border px-4 py-3 ${cor.borda} ${cor.fundo}`}>
        <p className={`text-sm font-semibold ${cor.marca}`}>{resumo}</p>
      </div>

      <section className="cartao">
        <h2 className="titulo-secao">Checagens</h2>
        <ul className="mt-3 space-y-2.5">
          {checagens.map((c, i) => (
            <li key={i} className="flex gap-2.5 text-sm">
              <span className={`shrink-0 font-bold ${CORES[c.estado].marca}`}>
                {SIMBOLO[c.estado]}
              </span>
              <span className="min-w-0">
                <span className="break-words">{c.titulo}</span>
                {c.detalhe ? (
                  <span className="block break-words text-xs text-[var(--color-texto-suave)]">
                    {c.detalhe}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="cartao">
        <h2 className="titulo-secao">Modos de IA</h2>
        <p className="mt-1.5 text-xs text-[var(--color-texto-suave)]">
          {ligados === 0
            ? "Nenhum configurado — a plataforma responde em modo demonstração, sem inventar."
            : `${ligados} de ${modos.length} configurados. O seletor no chat mostra só os ligados.`}
        </p>
        <ul className="mt-3 space-y-2.5">
          {modos.map((m) => (
            <li key={m.id} className="flex gap-2.5 text-sm">
              <span
                className={`shrink-0 font-bold ${
                  m.disponivel ? CORES.ok.marca : CORES.aviso.marca
                }`}
              >
                {m.disponivel ? SIMBOLO.ok : SIMBOLO.aviso}
              </span>
              <span className="min-w-0">
                <span className="break-words">
                  {m.rotulo} — {m.provedor}
                </span>
                <span className="block break-words text-xs text-[var(--color-texto-suave)]">
                  {m.disponivel ? (
                    <>
                      {m.variavelChave} presente · modelo {m.modelo}
                    </>
                  ) : (
                    <>
                      {m.variavelChave} ausente ·{" "}
                      <a
                        href={descreverModo(m.id).ondePegar}
                        className="underline"
                        rel="noreferrer"
                        target="_blank"
                      >
                        pegar a chave
                      </a>
                    </>
                  )}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {passos.length > 0 ? (
        <section className="cartao">
          <h2 className="titulo-secao">O que fazer</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--color-texto-suave)]">
            {passos.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        </section>
      ) : null}

      <p className="text-xs leading-relaxed text-[var(--color-texto-fraco)]">
        Nenhum valor de chave é exibido aqui — só presença, origem e formato. Esta página lê o
        estado a cada acesso; depois de salvar variáveis no painel e refazer o deploy, recarregue.
      </p>
    </main>
  );
}
