import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./src/lib/security";

const securityHeaders = Object.entries(SECURITY_HEADERS).map(([key, value]) => ({
  key,
  value,
}));

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Vecchi indirizzi → nuova struttura (Oggi · Clienti · Conti · Cassa · Archivio)
  async redirects() {
    return [
      { source: "/sospesi", destination: "/clienti", permanent: false },
      { source: "/sospesi/:id", destination: "/clienti/:id", permanent: false },
      { source: "/lay", destination: "/conti", permanent: false },
      { source: "/lay/tris", destination: "/conti/tris", permanent: false },
      { source: "/master", destination: "/conti/master", permanent: false },
      { source: "/master/:path*", destination: "/conti/master/:path*", permanent: false },
      { source: "/commissioni", destination: "/cassa", permanent: false },
      { source: "/prelievi", destination: "/cassa/prelievi", permanent: false },
      { source: "/rendiconto", destination: "/cassa/conta", permanent: false },
      { source: "/report", destination: "/archivio/report", permanent: false },
    ];
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
