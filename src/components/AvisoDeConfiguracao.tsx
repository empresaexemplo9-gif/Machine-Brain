/**
 * Faixa exibida quando o projeto Supabase ainda não foi configurado.
 *
 * Sem ele não há cadastro, login nem dado nenhum — então dizer exatamente o que
 * falta é mais útil do que deixar o formulário falhar com erro de conexão.
 */
export function AvisoDeConfiguracao() {
  return (
    <div
      data-teste="supabase-nao-configurado"
      className="mb-6 rounded-lg border border-[var(--color-ambar)]/40 bg-[var(--color-ambar)]/10 px-4 py-3"
    >
      <p className="text-xs font-semibold text-[var(--color-ambar)]">Supabase não configurado</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--color-texto-suave)]">
        Defina <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
        <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> em{" "}
        <code className="rounded bg-black/30 px-1">.env.local</code>, aplique as migrações de{" "}
        <code className="rounded bg-black/30 px-1">supabase/migrations</code> e refaça o build — as
        variáveis <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_</code> entram no bundle na
        hora de compilar. O passo a passo está no README.
      </p>
    </div>
  );
}
