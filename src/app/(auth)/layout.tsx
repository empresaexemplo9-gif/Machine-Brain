import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function LayoutDeAcesso({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-16">
      <Link href="/" className="mb-8 inline-block">
        <Logo altura={40} />
      </Link>
      {children}
    </main>
  );
}
