import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unpdf", "mammoth"],
  experimental: {
    // Uploads de peticoes/processos podem passar de 1 MB.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
