import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Content Security Policy: strikt in productie; ontwikkelserver heeft eval nodig.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self' https://login.microsoftonline.com",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone", // hostingonafhankelijk: draait als Node-proces of container
  poweredByHeader: false,
  serverExternalPackages: ["pg", "exceljs"],
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: csp },
        ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
      ],
    }];
  },
};

export default nextConfig;
