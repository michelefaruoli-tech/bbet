import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./src/lib/security";

const securityHeaders = Object.entries(SECURITY_HEADERS).map(([key, value]) => ({
  key,
  value,
}));

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
