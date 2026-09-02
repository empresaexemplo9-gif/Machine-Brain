import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DRAP EDUCA — do primeiro período à advocacia",
    template: "%s · DRAP EDUCA",
  },
  description:
    "Professor de Direito e assistente jurídico em um só lugar, com toda resposta ancorada em fonte oficial rastreável.",
};

export const viewport: Viewport = {
  themeColor: "#0a0e13",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
