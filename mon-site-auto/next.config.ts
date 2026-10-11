import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // Uncomment and configure CSP once the domain is confirmed:
  // { key: "Content-Security-Policy", value: "default-src 'self'; ..." },
];

const nextConfig: NextConfig = {
  images: {
    // Seuls les fichiers de public/ (racine) passent par l'optimiseur
    // /_next/image. Les images du CMS (/api/cms-media/<id>) en sont exclues :
    // elles arrivent déjà en variantes WebP (lib/cms-media-variants.ts), et une
    // copie optimisée échapperait à la purge par tag lors d'une dépublication.
    localPatterns: [{ pathname: "/*.{png,jpg,jpeg,webp,avif,gif,svg}", search: "" }],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
