import { NextResponse } from "next/server";

const isProd = process.env.NODE_ENV === "production";

/**
 * Builds a Content Security Policy header value.
 * Permissive enough for the app (maps, fonts, Supabase realtime) but blocks
 * the most common injection vectors.
 */
function buildCsp(): string {
  const scriptSrc = [
    "'self'",
    // Allow inline scripts only in dev (Next.js HMR needs it)
    isProd ? "" : "'unsafe-inline'",
    // next/script and webpack runtime need eval in dev
    isProd ? "" : "'unsafe-eval'",
  ]
    .filter(Boolean)
    .join(" ");

  const directives: string[] = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    // Allow inline styles (Tailwind, styled-jsx, maps inject inline styles)
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    // Maps (Goong, OSM) + Supabase storage + self
    `img-src 'self' data: blob: https://*.goong.io https://*.openstreetmap.org https://*.supabase.co`,
    // WebSocket for Supabase realtime; HTTPS for all APIs used
    `connect-src 'self' wss://*.supabase.co https://*.supabase.co https://nominatim.openstreetmap.org https://rsapi.goong.io https://tile.goong.io`,
    // Map tiles may use workers with blob: URLs
    `worker-src 'self' blob:`,
    // Map canvases / tiles
    `frame-src 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ];

  return directives.join("; ");
}

/**
 * Applies a comprehensive set of security headers to a NextResponse.
 * Call this in middleware for every outgoing response.
 */
export function applySecurityHeaders(res: NextResponse): NextResponse {
  // Prevent clickjacking
  res.headers.set("X-Frame-Options", "DENY");
  // Prevent MIME sniffing
  res.headers.set("X-Content-Type-Options", "nosniff");
  // Legacy XSS filter (still useful for older browsers)
  res.headers.set("X-XSS-Protection", "1; mode=block");
  // Limit referrer leakage
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Restrict dangerous browser features
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self), payment=(self)",
  );
  // HSTS — only in production (avoid breaking localhost HTTPS)
  if (isProd) {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
  // Content Security Policy
  res.headers.set("Content-Security-Policy", buildCsp());

  return res;
}
