/**
 * Regras do plano pré-pago.
 *
 * São aritmética de dinheiro e de prazo: erram em silêncio e o usuário só
 * descobre quando perde acesso que pagou, ou quando ganha acesso que não pagou.
 *
 *   npm run verificar:assinaturas
 */
import {
  MINIMO_CENTAVOS,
  calcularExpiracao,
  diasPara,
  diasRestantes,
  formatarReais,
} from "../src/lib/assinaturas";

let falhas = 0;
function conferir(nome: string, condicao: boolean, detalhe?: string): void {
  if (condicao) {
    console.log(`  ✓ ${nome}`);
    return;
  }
  falhas += 1;
  console.log(`  ✗ ${nome}`);
  if (detalhe) console.log(`      ${detalhe}`);
}

console.log("\nfaixas de valor");
conferir("R$ 25 compra 7 dias", diasPara(2_500) === 7, `veio ${diasPara(2_500)}`);
conferir("R$ 50 compra 14 dias", diasPara(5_000) === 14, `veio ${diasPara(5_000)}`);
conferir("R$ 100 compra 35 dias (30 + 5 de bônus)", diasPara(10_000) === 35, `veio ${diasPara(10_000)}`);
conferir("R$ 24,99 não compra nada", diasPara(2_499) === null, `veio ${diasPara(2_499)}`);
conferir("R$ 0 não compra nada", diasPara(0) === null);
conferir("valor negativo não compra nada", diasPara(-5_000) === null);
conferir("valor absurdo não quebra", diasPara(1_000_000) === 35, `veio ${diasPara(1_000_000)}`);
conferir("valor não numérico não compra nada", diasPara(Number.NaN) === null);

console.log("\nvalor entre faixas arredonda para baixo");
conferir("R$ 70 dá 14 dias, não 21", diasPara(7_000) === 14, `veio ${diasPara(7_000)}`);
conferir("R$ 99,99 ainda dá 14 dias", diasPara(9_999) === 14, `veio ${diasPara(9_999)}`);
conferir("R$ 49,99 ainda dá 7 dias", diasPara(4_999) === 7, `veio ${diasPara(4_999)}`);
conferir("o mínimo é exatamente R$ 25", MINIMO_CENTAVOS === 2_500);

console.log("\nrenovação antes de vencer não descarta o que já foi pago");
{
  const daquiA10Dias = new Date(Date.now() + 10 * 86_400_000);
  const novo = calcularExpiracao(7, daquiA10Dias);
  const esperado = 17;
  const obtido = diasRestantes(novo);
  conferir(
    `10 dias restantes + 7 comprados = ~${esperado} dias`,
    Math.abs(obtido - esperado) <= 1,
    `veio ${obtido}`,
  );
}
{
  const venceuOntem = new Date(Date.now() - 86_400_000);
  const obtido = diasRestantes(calcularExpiracao(7, venceuOntem));
  conferir("assinatura vencida não credita o atraso: conta do zero", Math.abs(obtido - 7) <= 1, `veio ${obtido}`);
}
{
  const obtido = diasRestantes(calcularExpiracao(35, null));
  conferir("primeira assinatura conta a partir de agora", Math.abs(obtido - 35) <= 1, `veio ${obtido}`);
}

console.log("\nexibição");
conferir("formata em real brasileiro", formatarReais(10_000).replace(/ /g, " ") === "R$ 100,00",
  `veio ${JSON.stringify(formatarReais(10_000))}`);
conferir("expirada mostra zero dias", diasRestantes(new Date(Date.now() - 1_000)) === 0);

console.log("");
if (falhas > 0) {
  console.log(`${falhas} falha(s) nas regras de assinatura.\n`);
  process.exit(1);
}
console.log("Regras de assinatura conferidas: faixas, arredondamento e renovação.\n");
