import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 text-center">
      <p className="text-4xl">⚖️</p>
      <h1 className="mt-4 text-xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-sm text-[var(--color-texto-suave)]">
        O endereço não existe ou o conteúdo não pertence à sua conta.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/estudante" className="botao py-2! text-xs!">
          Modo estudante
        </Link>
        <Link href="/profissional" className="botao-secundario py-2! text-xs!">
          Modo profissional
        </Link>
      </div>
    </main>
  );
}
