/** @type {import('next').NextConfig} */

// ---------------------------------------------------------------------------
// Security response headers
// Applied to every route (source: '/(.*)')
//
// CSP origin notes:
//   - Clerk:        scripts/frames served from *.clerk.accounts.dev and
//                   *.clerk.com; connect goes to clerk.clinixa.mx (issuer) and
//                   api.clerk.com.
//   - MercadoPago:  checkout redirect is a full navigation (no frame/script
//                   inline needed here), but the SDK JS is loaded from
//                   sdk.mercadopago.com and http2.mlstatic.com.
//   - Self:         'self' covers clinixa.mx and api.clinixa.mx (same-origin
//                   API calls go through Next.js rewrites).
//   - unsafe-inline for style-src: required by Tailwind CSS and Clerk's
//                   injected widget styles. Remove when a nonce-based approach
//                   is adopted.
//   - unsafe-inline for script-src: required by Next.js runtime hydration
//                   chunks in the current major version. Mark this TODO when
//                   upgrading to Next.js 15+ strict mode with nonces.
// ---------------------------------------------------------------------------

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    // max-age 1 year; includeSubDomains; no preload yet (add after verifying
    // all subdomains are HTTPS-only in prod).
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "X-Frame-Options",
    // DENY: the app does not embed itself in iframes anywhere.
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    // Only camera/microphone needed for future teleconsulta; disable everything
    // else.
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      // Default: same-origin only.
      "default-src 'self'",

      // Scripts: self + Next.js inline hydration (unsafe-inline, TODO: migrate
      // to nonces) + Clerk components + MercadoPago SDK.
      // TODO: remove 'unsafe-inline' when Next.js nonce support is wired up.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.accounts.dev https://sdk.mercadopago.com https://http2.mlstatic.com",

      // Styles: self + unsafe-inline (Tailwind + Clerk widget styles).
      // TODO: remove 'unsafe-inline' when adopting CSS-in-JS with nonces.
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

      // Fonts: self + Google Fonts CDN.
      "font-src 'self' https://fonts.gstatic.com",

      // Images: self + data URIs (used by Clerk avatars and chart libs) +
      // MercadoPago badge assets.
      "img-src 'self' data: blob: https://*.clerk.com https://img.clerk.com https://http2.mlstatic.com",

      // Fetch/XHR: self (API calls via Next.js rewrites) + Clerk backend +
      // MercadoPago.
      "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://api.clerk.com https://api.mercadopago.com https://api.clinixa.mx",

      // Frames: Clerk uses an iframe for its UI components.
      "frame-src https://*.clerk.com https://*.clerk.accounts.dev https://www.mercadopago.com.mx https://www.mercadopago.com",

      // Workers: none expected.
      "worker-src 'none'",

      // Object/base: locked down.
      "object-src 'none'",
      "base-uri 'self'",

      // Form actions: self only (all forms submit to the same origin).
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  async headers() {
    return [
      {
        // Apply to all routes.
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
