import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["192.168.0.87", "localhost:3000"],
  async headers() {
    return [
      {
        // Never let the browser serve a stale service worker from HTTP cache;
        // it must re-check the bytes so deploys with caching fixes are detected.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
