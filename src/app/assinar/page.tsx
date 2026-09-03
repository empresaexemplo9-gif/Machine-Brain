import type { Metadata } from "next";
import QRCode from "qrcode";
import { Cabecalho } from "@/components/Cabecalho";
import { exigirUsuario } from "@/lib/auth";
import { assinaturaAtiva } from "@/lib/servicos/assinaturas";
import { FAIXAS, diasRestantes, formatarReais } from "@/lib/assinaturas";
import { CopiarPix } from "./CopiarPix";

/**
 * Tela de pagamento. Só logado, de propósito.
 *
 * Sem sessão a plataforma não saberia a quem creditar o período — e um PIX
 * estático não carrega o nome de quem pagou de volta para cá. Exigir login é o
 * que permite mostrar o identificador que liga o pagamento a esta conta.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Assinar" };

const COPIA_E_COLA = (process.env.PIX_COPIA_E_COLA ?? "").trim();

export default async function PaginaDeAssinatura() {
  const usuario = await exigirUsuario();
  const ativa = await assinaturaAtiva();

  // Curto, legível ao telefone e ligado à conta: é o que o aluno escreve na
  // mensagem do PIX para o pagamento poder ser reconciliado.
  const codigo = `DRAP-${usuario.id.slice(0, 8).toUpperCase()}`;

  const qr = COPIA_E_COLA
    ? await QRCode.toString(COPIA_E_COLA, {
        type: "svg",
        margin: 1,
        errorCorrectionLevel: "M",
        // Contraste alto e fundo branco: leitor de QR erra com fundo colorido.
        color: { dark: "#05080f", light: "#ffffff" },
      })
    : null;

  return (
    <>
      <Cabecalho usuario={usuario} ambiente={usuario.ambiente} />
      <main className="pagina space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Assinar o plano Pro</h1>
          <p className="prosa mt-2 text-sm leading-relaxed text-[var(--color-texto-suave)]">
            Pré-pago por PIX. Você escolhe quanto pagar, e o valor define quantos dias valem. Não há
            cobrança recorrente: quando o período acaba, a conta volta ao plano gratuito e continua
            funcionando — só o modo Parecer sai do seletor.
          </p>
        </header>

        {ativa && (
          <div className="rounded-xl border border-[var(--color-verde)]/40 bg-[var(--color-verde)]/10 px-4 py-3">
            <p className="text-sm font-semibold text-[var(--color-verde)]">
              Plano Pro ativo — {diasRestantes(ativa.expiraEm)} dia(s) restantes
            </p>
            <p className="mt-1 text-xs text-[var(--color-texto-suave)]">
              Pagar de novo agora não desperdiça o que resta: o período novo começa quando este
              acabar.
            </p>
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="cartao">
            <h2 className="titulo-secao">Quanto pagar</h2>
            <ul className="mt-3 space-y-2">
              {FAIXAS.map((f) => (
                <li
                  key={f.centavos}
                  className="flex items-baseline justify-between gap-3 rounded-lg border border-[var(--color-borda)] px-3.5 py-2.5"
                >
                  <span className="text-sm font-semibold text-[var(--color-ouro)]">{f.rotulo}</span>
                  <span className="text-xs text-[var(--color-texto-suave)]">{f.detalhe}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-[var(--color-texto-fraco)]">
              Mínimo de {formatarReais(FAIXAS[FAIXAS.length - 1].centavos)}. Valor entre faixas conta
              pela faixa de baixo — {formatarReais(7_000)} valem 14 dias.
            </p>
          </div>

          <div className="cartao">
            <h2 className="titulo-secao">Pagar</h2>
            {qr ? (
              <>
                <div
                  className="mx-auto mt-3 w-full max-w-[220px] rounded-lg bg-white p-2"
                  // O SVG é gerado aqui no servidor a partir do texto do PIX;
                  // não vem de fora, então não há conteúdo de terceiro em jogo.
                  dangerouslySetInnerHTML={{ __html: qr }}
                />
                <CopiarPix codigo={COPIA_E_COLA} />
              </>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-[var(--color-ambar)]">
                A chave PIX ainda não foi configurada neste deploy. Defina{" "}
                <code className="rounded bg-black/30 px-1">PIX_COPIA_E_COLA</code> nas variáveis de
                ambiente com o código copia e cola gerado no seu banco.
              </p>
            )}

            <div className="mt-4 rounded-lg border border-[var(--color-borda)] bg-[var(--color-fundo)] px-3.5 py-3">
              <p className="text-xs text-[var(--color-texto-fraco)]">
                Escreva este código na mensagem do PIX:
              </p>
              <p className="mt-1 font-mono text-base font-semibold tracking-wider text-[var(--color-ouro)]">
                {codigo}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--color-texto-suave)]">
                É o que liga o pagamento a esta conta. Sem ele, o dinheiro chega sem remetente
                identificável e a liberação precisa ser feita a mão.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
