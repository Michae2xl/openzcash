import type { NextConfig } from "next";

// Content Security Policy. The app loads no third-party browser assets — fonts
// are self-hosted (next/font), the logo/favicon are same-origin, and the client
// only talks to same-origin /api/*. External calls (CoinGecko, lightwalletd,
// scanner, Google Sheets) are all server-side. So 'self' is sufficient;
// 'unsafe-inline' covers Next's hydration/bootstrap inline scripts and
// Tailwind's inline styles. No 'unsafe-eval'.
// 'blob:' is required by the 3D office (/zcg/office): three.js loads GLB-embedded
// textures via URL.createObjectURL (blob: URLs) and, when createImageBitmap is
// available, FETCHES that blob URL — so blob: must be allowed on both img-src
// (the <img> fallback) and connect-src (the fetch/ImageBitmap path).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework/version in responses.
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Heavy 3D assets (GLB models, graffiti textures) never change in place —
      // a new model gets a new filename. Without this, Next serves public/
      // files with max-age=0 and every office visitor re-downloads ~6MB.
      {
        source: "/office-assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/committee/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800" }, // 7 days
        ],
      },
      {
        source: "/zcash-emblem.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
      {
        source: "/zbo-emblem.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
};

export default nextConfig;
