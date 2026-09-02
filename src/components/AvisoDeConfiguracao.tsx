/**
 * Faixa exibida quando o projeto Supabase ainda não foi configurado.
 *
 * Sem ele não há cadastro, login nem dado nenhum — então dizer exatamente o que
 * falta é mais útil do que deixar o formulário falhar com erro de conexão.
 *
 * A faixa aparece tanto em desenvolvimento quanto num deploy, e o que resolve
 * cada caso é diferente: local é `.env.local`, publicado é o painel do provedor.
 * Por isso os dois caminhos estão escritos aqui — quem lê isto num site no ar
 * não tem `.env.local` nenhum para editar.
 */

const CODIGO = "rounded bg-black/30 px-1";

export function AvisoDeConfiguracao() {
  return (
    <div
      data-teste="supabase-nao-configurado"
      className="mb-6 rounded-lg border border-[var(--color-ambar)]/40 bg-[var(--color-ambar)]/10 px-4 py-3"
    >
      <p className="text-xs font-semibold text-[var(--color-ambar)]">Supabase não configurado</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--color-texto-suave)]">
        Defina <code className={CODIGO}>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
        <code className={CODIGO}>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> (ou{" "}
        <code className={CODIGO}>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, conforme o que o painel do
        Supabase mostrar) e aplique as migrações de{" "}
        <code className={CODIGO}>supabase/migrations</code>.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-[var(--color-texto-suave)]">
        Em desenvolvimento as variáveis vão no <code className={CODIGO}>.env.local</code>; num
        deploy, nas variáveis de ambiente do provedor — na Vercel, em{" "}
        <em>Settings → Environment Variables</em>, marcando também o ambiente{" "}
        <em>Production</em>. Nos dois casos é preciso refazer o build depois: as variáveis{" "}
        <code className={CODIGO}>NEXT_PUBLIC_</code> entram no bundle na hora de compilar, então
        alterá-las sem um novo build (ou um <em>redeploy</em>) não muda nada. O passo a passo está
        no README.
      </p>
      <p className="mt-2 text-xs text-[var(--color-texto-suave)]">
        <a href="/diagnostico" className="font-semibold text-[var(--color-ambar)] hover:underline">
          Ver o diagnóstico deste deploy →
        </a>{" "}
        diz qual dos passos falta, em vez de deixar você adivinhar.
      </p>
    </div>
  );
}
