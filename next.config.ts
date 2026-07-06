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
      {
        // OCR engine + traineddata live in version-stamped directories
        // (/ocr/engine/v…, /ocr/tessdata/v1) — an upgrade changes the URL,
        // never the bytes, so these ~4 MB assets can cache forever.
        source: "/ocr/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
