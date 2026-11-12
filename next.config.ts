import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control",     value: "on" },
  { key: "Strict-Transport-Security",  value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options",            value: "DENY" },
  { key: "X-Content-Type-Options",     value: "nosniff" },
  { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",   // unsafe-inline/eval needed for Next.js dev + RSC
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://aiplatform.googleapis.com https://www.google-analytics.com https://region1.google-analytics.com https://analytics.google.com",
      "media-src 'self' blob:",                              // blob: per audio TTS generato client-side
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["@aws-sdk/client-s3"],
  // I piani di assistenza sono stati sostituiti dall'offerta su /inizia
  async redirects() {
    return [
      { source: "/pricing", destination: "/inizia", permanent: true },
      { source: "/prenota-demo", destination: "/inizia", permanent: true },
    ];
  },
  async headers() {
    // Pagine di servizio (accesso, verifica, area riservata): non devono finire
    // nell'indice di Google. Il noindex va nell'header perché sono client component.
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      ...["/login", "/register", "/verify", "/verify-login-otp", "/verify-mfa", "/benvenuto", "/auth/:path*", "/dashboard", "/dashboard/:path*"]
        .map((source) => ({ source, headers: noindex })),
    ];
  },
};

export default nextConfig;
