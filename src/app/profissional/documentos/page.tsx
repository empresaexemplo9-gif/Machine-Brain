import type { Metadata } from "next";
import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { MODO_DEMONSTRACAO } from "@/lib/ia/cliente";
import { documentosDoUsuario } from "@/lib/servicos/documentos";
import { AvisoDeDemonstracao } from "@/components/AvisoDeDemonstracao";
import { enviarDocumentoAction } from "./acoes";
import { FormularioDeUpload } from "./FormularioDeUpload";

export const metadata: Metadata = { title: "Documentos" };

export default async function PaginaDocumentos() {
  const usuario = await exigirUsuario();
  const documentos = await documentosDoUsuario(30);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">📄 Análise de documentos</h1>
        <p className="mt-1 prosa text-sm text-[var(--color-texto-suave)]">
          Envie uma peça, um contrato ou os autos. A plataforma extrai o texto e devolve o caso
          organizado — com os pontos que merecem sua atenção antes de qualquer coisa.
        </p>
      </header>

      {MODO_DEMONSTRACAO && <AvisoDeDemonstracao />}

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <FormularioDeUpload acao={enviarDocumentoAction} />

        <div>
          <h2 className="titulo-secao mb-3">Enviados</h2>
          {documentos.length === 0 ? (
            <p className="cartao text-xs text-[var(--color-texto-fraco)]">
              Nenhum documento enviado ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {documentos.map((d) => (
                <li key={d.id}>
                  <Link href={`/profissional/documentos/${d.id}`} className="cartao-interativo block p-3.5!">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-xs font-medium">{d.nome_arquivo}</p>
                      <span
                        className={`shrink-0 text-[0.65rem] ${
                          d.analisado ? "text-[var(--color-verde)]" : "text-[var(--color-texto-fraco)]"
                        }`}
                      >
                        {d.analisado ? "analisado" : "pendente"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--color-texto-fraco)]">
                      {d.tipo.toUpperCase()} · {d.caracteres.toLocaleString("pt-BR")} caracteres ·{" "}
                      {d.criado_em}
                    </p>
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
