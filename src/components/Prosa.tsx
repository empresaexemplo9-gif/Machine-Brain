import type { ReactNode } from "react";
import type { Fonte } from "@/lib/fontes";

/**
 * Renderizador do texto gerado pelo modelo.
 *
 * Feito à mão, sem biblioteca de markdown, por dois motivos: o subconjunto que o
 * modelo usa é pequeno, e — mais importante — o marcador [[fonte:ID]] precisa
 * virar um elemento de interface (a bolinha de citação), não texto. Tudo é
 * montado como elemento React, sem HTML cru, então não há superfície de XSS.
 */

const MARCADOR = /\[\[fonte:([a-z0-9-]+)\]\]/gi;

function Citacao({ fonte, indice }: { fonte: Fonte | undefined; indice: number }) {
  if (!fonte) {
    // Citação para um id que não existe no catálogo: sinalizada, nunca escondida.
    return (
      <sup
        className="mx-0.5 inline-flex items-center rounded bg-[var(--color-vermelho)]/15 px-1 text-[0.65rem] font-bold text-[var(--color-vermelho)]"
        title="Citação sem fonte correspondente no catálogo verificado."
      >
        ?
      </sup>
    );
  }
  return (
    <a
      href={fonte.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${fonte.siglaNorma} — ${fonte.dispositivo}: ${fonte.ementa}`}
      className="mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded bg-[var(--color-ouro)]/15 px-1 align-super text-[0.65rem] font-bold text-[var(--color-ouro)] no-underline hover:bg-[var(--color-ouro)]/30"
    >
      {indice}
    </a>
  );
}

function inline(texto: string, mapa: Map<string, { fonte?: Fonte; indice: number }>): ReactNode[] {
  const partes: ReactNode[] = [];
  let cursor = 0;
  let chave = 0;

  // Primeiro os marcadores de fonte; o restante passa pelo formatador de ênfase.
  for (const achado of texto.matchAll(MARCADOR)) {
    const inicio = achado.index ?? 0;
    if (inicio > cursor) partes.push(...enfase(texto.slice(cursor, inicio), chave++));
    const id = achado[1].toLowerCase();
    const registro = mapa.get(id);
    partes.push(
      <Citacao key={`c${chave++}`} fonte={registro?.fonte} indice={registro?.indice ?? 0} />,
    );
    cursor = inicio + achado[0].length;
  }
  if (cursor < texto.length) partes.push(...enfase(texto.slice(cursor), chave++));
  return partes;
}

/** Aplica **negrito** e `código` sem recorrer a HTML cru. */
function enfase(texto: string, semente: number): ReactNode[] {
  const partes: ReactNode[] = [];
  const padrao = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let cursor = 0;
  let chave = 0;

  for (const achado of texto.matchAll(padrao)) {
    const inicio = achado.index ?? 0;
    if (inicio > cursor) partes.push(texto.slice(cursor, inicio));
    if (achado[1] !== undefined) {
      partes.push(<strong key={`b${semente}-${chave++}`}>{achado[1]}</strong>);
    } else {
      partes.push(<code key={`k${semente}-${chave++}`}>{achado[2]}</code>);
    }
    cursor = inicio + achado[0].length;
  }
  if (cursor < texto.length) partes.push(texto.slice(cursor));
  return partes;
}

export function Prosa({
  texto,
  fontes = [],
  className = "",
}: {
  texto: string;
  fontes?: Fonte[];
  className?: string;
}) {
  const mapa = new Map(fontes.map((f, i) => [f.id.toLowerCase(), { fonte: f, indice: i + 1 }]));

  const linhas = texto.split("\n");
  const blocos: ReactNode[] = [];
  let listaAtual: { tipo: "ul" | "ol"; itens: string[] } | null = null;

  const fecharLista = () => {
    if (!listaAtual) return;
    const itens = listaAtual.itens.map((item, i) => <li key={i}>{inline(item, mapa)}</li>);
    blocos.push(
      listaAtual.tipo === "ul" ? (
        <ul key={`l${blocos.length}`}>{itens}</ul>
      ) : (
        <ol key={`l${blocos.length}`}>{itens}</ol>
      ),
    );
    listaAtual = null;
  };

  for (const linha of linhas) {
    const podada = linha.trim();

    if (!podada) {
      fecharLista();
      continue;
    }

    const marcador = /^[-*•]\s+(.*)$/.exec(podada);
    const numerada = /^\d+[.)]\s+(.*)$/.exec(podada);

    if (marcador) {
      if (listaAtual?.tipo !== "ul") fecharLista();
      listaAtual ??= { tipo: "ul", itens: [] };
      listaAtual.itens.push(marcador[1]);
      continue;
    }
    if (numerada) {
      if (listaAtual?.tipo !== "ol") fecharLista();
      listaAtual ??= { tipo: "ol", itens: [] };
      listaAtual.itens.push(numerada[1]);
      continue;
    }

    fecharLista();

    const titulo = /^(#{2,4})\s+(.*)$/.exec(podada);
    if (titulo) {
      const conteudo = inline(titulo[2], mapa);
      blocos.push(
        titulo[1].length === 2 ? (
          <h2 key={`t${blocos.length}`}>{conteudo}</h2>
        ) : (
          <h3 key={`t${blocos.length}`}>{conteudo}</h3>
        ),
      );
      continue;
    }

    blocos.push(<p key={`p${blocos.length}`}>{inline(podada, mapa)}</p>);
  }
  fecharLista();

  return <div className={`prosa ${className}`}>{blocos}</div>;
}
