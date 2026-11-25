import type { NextConfig } from "next";

/**
 * Statische export voor GitHub Pages. De site wordt gepubliceerd onder
 * /<repository>/; zet NEXT_PUBLIC_BASE_PATH (bv. "/portfolio-") bij het bouwen.
 * Gegevens komen rechtstreeks uit Supabase (zie src/lib/db.ts).
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
