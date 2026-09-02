import Link from "next/link";

export default function LayoutDeAcesso({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="text-lg">⚖️</span>
        <span className="text-sm font-bold tracking-tight">Machine Brain</span>
      </Link>
      {children}
    </main>
  );
}
