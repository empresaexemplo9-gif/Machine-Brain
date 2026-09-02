import type { Metadata } from "next";
import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { CATALOGO } from "@/lib/fontes";
import { documentosDoUsuario } from "@/lib/servicos/documentos";
import { roteirosDoUsuario } from "@/lib/servicos/roteiro";
import { conversasDoUsuario } from "@/lib/servicos/conversas";

export const metadata: Metadata = { title: "Painel profissional" };

const FERRAMENTAS = [
  {
    href: "/profissional/jurista",
    emoji: "⚖️",
    titulo: "Jurista IA",
    texto: "Pergunte, discuta uma tese ou peça a estrutura de uma peça. Toda norma vem com a fonte.",
  },
  {
    href: "/profissional/documentos",
    emoji: "📄",
    titulo: "Análise de documentos",
    texto: "Envie um PDF ou DOCX: partes, objeto, fase, pedidos e pontos de atenção.",
  },
  {
    href: "/profissional/roteiro",
    emoji: "🧭",
    titulo: "Nunca vi esse caso",
    texto: "Roteiro de atuação em oito etapas para um tipo de causa que você não domina.",
  },
];

export default async function PainelProfissional() {
  const usuario = await exigirUsuario();
  const documentos = documentosDoUsuario(usuario.id, 5);
  const roteiros = roteirosDoUsuario(usuario.id, 5);
  const conversas = conversasDoUsuario(usuario.id, "profissional", 5);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          Olá, {usuario.nome.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
          Ambiente profissional · {CATALOGO.length} dispositivos verificados no catálogo
        </p>
      </header>

      <section>
        <ul className="grid gap-3 sm:grid-cols-3">
          {FERRAMENTAS.map((f) => (
            <li key={f.href}>
              <Link href={f.href} className="cartao-interativo block h-full">
                <h2 className="text-sm font-semibold">
                  <span className="mr-2">{f.emoji}</span>
                  {f.titulo}
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-texto-suave)]">
                  {f.texto}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-8 lg:grid-cols-3">
        <div>
          <h2 className="titulo-secao mb-3">Documentos recentes</h2>
          {documentos.length === 0 ? (
            <p className="cartao text-xs text-[var(--color-texto-fraco)]">Nenhum documento enviado.</p>
          ) : (
            <ul className="space-y-2">
              {documentos.map((d) => (
                <li key={d.id}>
                  <Link href={`/profissional/documentos/${d.id}`} className="cartao-interativo block p-3.5!">
                    <p className="truncate text-xs font-medium">{d.nome_arquivo}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-texto-fraco)]">
                      {d.analisado ? "analisado" : "aguardando análise"} ·{" "}
                      {d.caracteres.toLocaleString("pt-BR")} caracteres
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="titulo-secao mb-3">Roteiros</h2>
          {roteiros.length === 0 ? (
            <p className="cartao text-xs text-[var(--color-texto-fraco)]">Nenhum roteiro criado.</p>
          ) : (
            <ul className="space-y-2">
              {roteiros.map((r) => (
                <li key={r.id}>
                  <Link href={`/profissional/roteiro/${r.id}`} className="cartao-interativo block p-3.5!">
                    <p className="line-clamp-2 text-xs">{r.caso}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="titulo-secao mb-3">Conversas</h2>
          {conversas.length === 0 ? (
            <p className="cartao text-xs text-[var(--color-texto-fraco)]">Nenhuma conversa ainda.</p>
          ) : (
            <ul className="space-y-2">
              {conversas.map((c) => (
                <li key={c.id}>
                  <Link href={`/profissional/jurista?conversa=${c.id}`} className="cartao-interativo block p-3.5!">
                    <p className="line-clamp-2 text-xs">{c.titulo}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
